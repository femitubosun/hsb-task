# Hot Spots Beauty - Booking & Availability API

A booking and availability API built with NestJS, featuring real-time slot computation, Redis-powered concurrency control, and cache invalidation patterns.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Core Features](#core-features)
- [Key API Flows](#key-api-flows)
- [Environment Variables](#environment-variables)
- [Performance Characteristics](#performance-characteristics)
- [Concurrency Design Evolution](#concurrency-design-evolution)
- [Design Trade-offs](#design-trade-offs)
- [Stretch Goals Implemented](#stretch-goals-implemented)
- [Features Not Implemented](#features-not-implemented)
- [Areas for Improvement](#areas-for-improvement)
- [Testing Strategy](#testing-strategy)
- [Load Testing](#load-testing)
- [License](#license)
- [Author](#author)

## Architecture Overview

This API implements a Redis-powered real-time availability system that computes free slots on-demand rather than pre-caching them. The architecture prioritizes consistency and correctness over pre-computed speed, achieving sub-50ms response times for availability queries.

### Key Design Decisions

**Real-Time Computation over Pre-Caching**: Instead of pre-computing and caching availability slots, we compute them in real-time using Redis Lua scripts. This eliminates cache invalidation complexity and ensures 100% accuracy.

**Redis as Source of Truth for Locks**: Bookings are atomically locked in Redis first using a sweepline algorithm for conflict detection, then persisted to MongoDB. This guarantees no double-bookings under concurrent load.

**Read-Through Cache Pattern**: Provider configurations (working hours, buffers, services) are cached with sophisticated invalidation, while availability slots are always computed fresh.

**Outbox Pattern**: All booking lifecycle events (created, rescheduled, cancelled) are recorded to an outbox collection for reliable event delivery.

## Project Structure

```
src/
├── core/               # Core application setup (config, health checks)
├── common/             # Shared utilities, entities, repositories
├── infra/              # Infrastructure concerns
│   ├── db/            # MongoDB connection
│   ├── redis/         # Redis connection & Lua scripts
│   ├── bullmq/        # Job queue for background processing
│   ├── cron/          # Scheduled tasks
│   └── rate-limiting/ # API throttling
├── lib/                # Business-agnostic libraries
│   ├── cache/         # Read-through cache implementation
│   ├── queue/         # Queue abstractions
│   └── http/          # HTTP client utilities
└── modules/            # Feature modules
    ├── identity/      # Authentication & user management
    ├── profile/       # Business profiles
    ├── services/      # Service definitions
    ├── availability/  # Real-time slot computation
    ├── booking/       # Booking lifecycle management
    └── outbox/        # Event outbox
```

### Repository Pattern

All data access follows a consistent repository pattern defined in `src/common/repository/base.abstract.repository.ts`:

- Soft delete support (deletedAt field)
- Consistent query interfaces
- Projection and options support
- Type-safe operations

## Tech Stack

- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: NestJS 11
- **Database**: MongoDB 7 (with Mongoose ODM)
- **Cache/Locks**: Redis 7
- **Queue**: BullMQ
- **Auth**: JWT with Redis-backed sessions and role-based access control (client, business, admin)
- **API Docs**: Scalar UI + OpenAPI 3.0
- **Testing**: Jest (unit + integration)
- **Containerization**: Docker + Docker Compose

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose

### Quick Start

1. **Clone and install dependencies**:

```bash
pnpm install
```

2. **Configure environment**:

```bash
cp .env.example .env
```

Edit `.env` with your configuration. Key variables:

- `DATABASE_URL`: MongoDB connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET_KEY`: Secret for JWT signing
- `BOOKING_EVENTS_URL`: Webhook URL for booking events

3. **Start infrastructure** (MongoDB + Redis):

```bash
pnpm run docker:dev
```

4. **Run database migrations & seed data**:

```bash
pnpm run seed
```

This creates:

- 1 admin user (admin@hsb.com / password123)
- 1 business user (business@hsb.com / password123)
- 1 client user (client@hsb.com / password123)
- Sample business profile with services
- Working hours template with availability exceptions

5. **Start development server**:

```bash
pnpm run start:dev
```

The API will be available at `http://localhost:5800`

### API Documentation

Interactive API documentation is available at:

- **Swagger**: http://localhost:5800/api/docs
- **OpenAPI JSON**: http://localhost:5800/api/docs/json
- **Postman Docs**: https://documenter.getpostman.com/view/23283058/2sB3QRn6hE

A Postman collection is also included in the repository root for easy testing.

### Running Tests

```bash
# Unit tests
pnpm test

# Integration tests (requires Docker)
pnpm run test:integration:full

# Watch mode
pnpm test:watch

# Coverage
pnpm test:cov
```

## Core Features

### 1. Availability Management

Businesses can define their availability using:

- **Weekly schedules**: Define working hours per day of week
- **Service buffers**: Before/after buffers to prevent back-to-back bookings
- **Availability overrides**: Holiday closures, extended hours, one-off schedule changes

### 2. Real-Time Slot Computation

The availability search endpoint computes available slots in real-time:

- Respects working hours, buffers, and schedule overrides
- Accounts for existing bookings
- Uses Redis Lua scripts for atomic gap computation
- Performance: ~37ms average for 7-day window

**Algorithm**: A sweepline algorithm processes all bookings as intervals, identifying gaps that fit the requested service duration + buffers.

### 3. Booking Management

#### Creating Bookings

- Idempotent via `x-idempotency-key` header
- Atomic Redis lock prevents double-booking
- Price captured at booking time (immutable)
- Automatic outbox event creation

#### Rescheduling

- Validates new slot availability atomically
- Updates Redis locks
- Records rescheduled event to outbox

#### Cancellation

- Calculates late cancellation fee (configurable threshold & percentage)
- Default: 30% fee if cancelled <12 hours before start
- Releases Redis locks
- Records cancellation event to outbox

### 4. Concurrency Control

**The Problem**: Under concurrent load, multiple requests might try to book the same time slot simultaneously.

**Our Solution**: Three-layer defense:

1. **Redis Lua Scripts**: Atomic conflict detection using sweepline algorithm - all bookings for a provider are fetched and gap computation happens atomically in Redis
2. **MongoDB Unique Index**: Compound index on (providerId, startsAt, endsAt, status) as a failsafe
3. **Idempotency Keys**: Prevent duplicate bookings from client retries

This approach guarantees zero double-bookings even under high concurrent load.

### 5. Cache Strategy

**Single-Layer Cache**: Only provider configurations are cached (working hours, services, buffers).

**Cache Invalidation**: Automatically triggered on:

- Working hours update
- Service modification
- Availability override changes

**Why Not Cache Slots?**:
Caching availability slots introduces complex invalidation logic. Every booking, cancellation, or schedule change would require cache invalidation across potentially many cached slot entries. Real-time computation with Redis Lua scripts achieves acceptable performance (<50ms) with zero invalidation complexity and guaranteed accuracy.

### 6. Event Outbox

All booking lifecycle events are recorded to the `outbox` collection:

- `BOOKING_CREATED`
- `BOOKING_RESCHEDULED`
- `BOOKING_CANCELLED`

A background worker (BullMQ) processes events and delivers webhooks to the configured `BOOKING_EVENTS_URL` endpoint. This provides:

- Reliable event delivery with retries
- Decoupled event processing
- Audit trail of all booking changes

### 7. Rate Limiting

API endpoints are protected with configurable rate limiting:

- Default: 5 requests per 1000ms per IP
- Configured via `THROTTLE_TTL` and `THROTTLE_LIMIT` environment variables
- Can be adjusted on a per-route basis

### 8. Role-Based Access Control

Three roles with distinct permissions:

- **Client**: Search availability, create/reschedule/cancel own bookings
- **Business**: Manage services, availability schedules/overrides, view all bookings for their business
- **Admin**: Full system access for support and operations

## Key API Flows

The API is fully documented in Swagger/Postman. Here are the core flows:

### Availability Search

Search for available time slots for a specific service within a date range. The system computes slots in real-time accounting for working hours, existing bookings, and configured buffers.

### Create Booking

Create a new booking with idempotency support. The booking is atomically locked in Redis before being persisted to MongoDB, preventing double-bookings.

### Reschedule Booking

Move an existing booking to a new time slot. The new slot availability is validated atomically and locks are updated.

### Cancel Booking

Cancel a booking with automatic late cancellation fee calculation based on how close to the start time the cancellation occurs.

## Environment Variables

```bash
# Application
NODE_ENV=development
PORT=5800
APP_NAME=Hot Spots Beauty

# Authentication
JWT_SECRET_KEY=your-secret-key
JWT_EXPIRES_IN=7d
AUTH_SESSION_TTL=604800
SEED_PASSWORD=password123

# Infrastructure
DATABASE_URL=mongodb://localhost/hsb
REDIS_URL=redis://localhost:6379
BULL_MQ_REDIS_URL=redis://localhost:6379

# Webhooks
BOOKING_EVENTS_URL=https://webhook.site/your-id

# Rate Limiting
THROTTLE_TTL=1000
THROTTLE_LIMIT=5
```

## Performance Characteristics

### Availability Search

- **Target**: <300ms for 7-day window
- **Actual**: ~37ms average
- **Breakdown**:
  - Redis Lua script execution: ~5-10ms
  - MongoDB provider config fetch: ~15-20ms (cached after first request)
  - Network overhead: ~5-10ms

### Booking Creation

- **Average**: ~45ms
- **Includes**: Redis lock acquisition + MongoDB write + outbox event

### Why Redis Lua?

- **Atomic execution**: Entire sweepline algorithm runs atomically - no race conditions
- **Network efficiency**: Single round-trip instead of multiple Redis commands
- **CPU-bound**: Algorithm runs in Redis, close to the data
- **Consistent performance**: O(n log n) where n = number of existing bookings for the provider

## Concurrency Design Evolution

## Problem Statement

The core description of the problem is addressed in these two points from the assessment document.

1. Performance: availability search under 300 ms for a 7‑day window.

2. Concurrency: no double bookings under race conditions

To begin with, the 2nd is more important. Performance can always be optimized, the core feature is to make sure double booking is impossible.

First, to handle race conditions, the go-to pattern is to use locks. However, how do we design locks specifically for Hot Spot Beauty's use case. This use case differs from popular booking use cases(e.g rentals, hotels and similar) where there are discreet time slots (hours/days). In this use case, the `Business` defines Services and its time duration freely. For the sake of simplicity in this context-- A Service's time block is `bufferBefore` + `duration` + `bufferAfter`.

This leads me to the first assumption I made.

1. No overnight booking.

And while we are here, the `AvailabilitySchedule` definition looks like this:

```json
{
  "daysOfWeek": ["monday", "tuesday", "wednesday", "thursday", "friday"],
  "startTime": "10:00",
  "endTime": "15:00",
  "effectiveFrom": "2025-12-23"
}
```

For the sake of simplicity, we will be ignoring Overrides for now.
This means, we must search for availability w.r.t. this schedule.

Back to the lock. This simplified things greatly. And This meant that to prevent double booking under race conditions. I just had to do two things.

## First Solution - Day Locks

By locking the entire day, under the assumption that there are no overnight bookings, we can ensure that no two customers would book at the same time.

### Pseudocode

```ts
const key = 'businessId:2025-10-19';
const val = '1';
const ttl = 5; // seconds
const lock = await redis.set(key, val, { NX: true, EX: ttl });
```

This actually works well. Provided we can solve the issue of overlaps.

## Detecting Overlapping Bookings Efficiently

Given an existing Booking:

```json
{
  "startTime": "12:00",
  "endTime": "13:04"
}
```

It cannot overlap with a new Booking:

```json
{
  "startTime": "11:00",
  "endTime": "14:00"
}
```

The atomic rule for non-overlap is:

```
new.endTime <= existing.startTime
OR
new.startTime >= existing.endTime
```

If neither condition holds, the two intervals overlap.

The issue is that it breaks down once we have more than two bookings. We can't compare everything against everything. We need something that works across the entire day in one pass.

The insight is this: overlaps only depend on **time order**.

If you line up all start and end times chronologically, you can track what's "active" as time moves forward.

- `Each start adds one active booking.`
- `Each end removes one.`

Whenever the count of active bookings is greater than one, you have a conflict. When it drops back to zero, you've hit a free slot.

That's the logic behind the `Sweepline Algorithm` — an ordered walk through time that keeps track of how many bookings are open at each moment.

### Sweepline Algorithm in TS for conflict detection

```ts
interface Booking {
  id: string;
  start: number; // epoch ms
  end: number; // epoch ms
}

interface Conflict {
  a: Booking;
  b: Booking;
  start: number;
  end: number;
  duration: number;
}

export function findConflicts(bookings: Booking[]): Conflict[] {
  const sorted = [...bookings].sort((a, b) => a.start - b.start);
  const conflicts: Conflict[] = [];

  let active: Booking | null = null;

  for (const current of sorted) {
    // Nothing active yet — set and move
    if (!active) {
      active = current;
      continue;
    }

    // If current starts after or exactly when active ends — no overlap
    if (current.start >= active.end) {
      active = current;
      continue;
    }

    // Otherwise, overlap exists
    const start = Math.max(active.start, current.start);
    const end = Math.min(active.end, current.end);
    const duration = end - start;

    conflicts.push({ a: active, b: current, start, end, duration });

    // Extend the active window if current ends later
    if (current.end > active.end) {
      active = current;
    }
  }
  return conflicts;
}
```

I won't go further into Sweepline. But with this, we can see that our locks have potential for optimization.

## Booking Time Slot as Lock & Redis Lua Script

Sweepline gives us the ability to lock a particular time slot which frees us from the restrictions of day locks. This gives us granular locks which is optimal for our use case. The issue now is atomicity. We can't be doing all this computation if another user can come and book the timeslot in the middle of it.

Again, following the logic that booking time slots are the locks. To create a timeslot, all we have to do is try to acquire that time slot. If it's free, then we book it, if not, it's in conflict.

I implemented the sweepline algorithm to compute gaps in a day as a lua script in `get-available-slots.lua`.

The only thing we have to do is basically give it dayStart, dayEnd, the duration we need, and the date.

To get this, we run through the availability configuration and get the business's open days. This is an expensive computation because we unavoidably have to go day after day factoring in overrides. So we cache this layer with a 30-day lookahead which keeps us performant for a 30 day window. The days are passed to redis, and we get available gaps for each of those days, all of them are combined to give the availability within that time range.

> [!NOTE] Idea
> Even as I write this, I realize that if we treat the dates as fully continuous. we can get all available gaps from redis in a single redis call and not do N calls for all days in range. We would then have a one loop in ts to filter out valid gaps. Is this worth it, though?

But this is really the entire idea. The other part is `atomic-booking-lock.lua`.
Which does the insertion of the booking timeslot in a way that is optimized for our sweepline.

We use `sortedsets` to store booking.start as `score` and `bookingId` as `value`.
We store the endTime in a hash `key` -> bookingId value is booking.end.

Two other scripts are helpers for rescheduling and swapping.

When we cancel a booking we simply delete the records from those two data stores, releasing the slot to be booked.

`booking.create`

```ts
const lockAcquired = await this.bookingLockService.tryAcquireSlot({
  businessId: service.businessId.toString(),
  date: bookingDate,
  start: startWithBuffer.getTime(),
  end: endWithBuffer.getTime(),
  bookingId: bookingId.toString(),
});

if (!lockAcquired) {
  throw new BadRequestException(TIME_NOT_AVAILABLE_FOR_BOOKING);
}
// ...
```

`booking-lock.try-acquire-slot`

```ts
  async tryAcquireSlot(range: BookingRange): Promise<boolean> {
    const key = `bookings:${range.businessId}:${range.date}`;

    const result = await this.redisService.instance.evalSha(
      this.#lockScriptSha,
      {
        keys: [key],
        arguments: [
          range.start.toString(),
          range.end.toString(),
          range.bookingId,
        ],
      },
    );

    return result === 1;
  }

```

With this setup, for a 30 day window we get:

```bash
   http_req_duration
    ✓ 'p(99)<100' p(99)=27.78ms

```

## Design Trade-offs

### What We Do

- ✅ Real-time slot computation (no pre-caching of availability)
- ✅ Redis-first locking with MongoDB persistence
- ✅ Read-through cache for provider configurations only
- ✅ Outbox pattern for reliable event delivery
- ✅ Idempotency via idempotencyKey in request body
- ✅ Pessimistic locking to guarantee consistency

### What We Don't Do

- ❌ Pre-compute or cache availability slots
- ❌ Optimistic locking (we use pessimistic via Redis)
- ❌ Event sourcing (traditional CRUD with outbox for events)
- ❌ Multi-provider concurrent bookings (sequential processing per provider)

### Key Benefits

- **Consistency**: Always accurate availability - no stale cache issues
- **Simplicity**: No complex cache invalidation logic for slots
- **Performance**: Sub-50ms queries acceptable for user-facing API
- **Reliability**: Zero lost bookings under concurrent load
- **Maintainability**: Clear separation of concerns, easy to reason about

### Key Tradeoffs

- **Redis Dependency**: Single point of failure - system unavailable if Redis fails
- **Network Overhead**: Multiple Redis round-trips per booking operation
- **Provider Bottlenecks**: High-volume providers create contention on shared Redis keys
- **Rescheduling Complexity**: Atomic time slot swaps require multiple Redis operations
- **Memory Scaling**: Redis memory grows with total bookings, requiring cleanup jobs

## Stretch Goals Implemented

- ✅ Webhook delivery for booking events via outbox pattern
- ✅ Rate limiting with configurable thresholds
- ⏳ Audit trail
- ⏳ Multi-resource support (foundation in place)
- ⏳ iCal export (not implemented)

## Features Not Implemented

- **Audit Logs**: No dedicated, user-facing audit trail for all system actions was created.
- **iCal Export**: Functionality to export bookings or schedules to iCal format is not available.
- **Multi-Resource Support**: The system does not support assigning specific staff/resources (e.g., a particular stylist or room) to a service, which would require more complex conflict checks.

## Areas for Improvement

- **Pagination**: API responses that return lists have limited or no pagination, as the focus was on core booking functionality.
- **Cache Invalidation**: The current cache keys are broad. More granular keys (e.g., per-business, per-day) would allow for smarter, more targeted cache invalidation.
- **Payment Integration**: Payments are not implemented. Bookings are confirmed immediately upon creation. The refund process only marks the booking with a refund amount and date, without interacting with a payment gateway.
- **Query Optimizations**: Further analysis could identify and optimize slow database queries, especially for complex availability searches.
- **Configurable Webhooks**: The webhook endpoint is defined by a single environment variable. This could be improved to allow businesses to manage their own webhook configurations via the API.
- **Outbox API**: The outbox, which stores events for webhook delivery, is not currently accessible via an API for monitoring or manual intervention.

## Testing Strategy

### Unit Tests

- Service layer business logic
- Repository operations
- Utility functions
- Mock external dependencies (Redis, MongoDB)

### Integration Tests

- End-to-end API flows
- Database operations with real MongoDB
- Redis lock behavior with real Redis
- Concurrent booking scenarios to verify no double-bookings

Run integration tests with:

```bash
pnpm run test:integration:full
```

This automatically:

1. Spins up test Docker containers (isolated MongoDB + Redis)
2. Runs the full integration test suite
3. Tears down containers and cleans up

## Load Testing

This project includes a load test script using `k6` to simulate concurrent booking attempts and verify the system's performance and concurrency controls.

### 1. Disable Rate Limiting

Before running the load test, you must disable the global rate-limiting guard.

In `src/infra/rate-limiting/rate-limiting.module.ts`, comment out the `ThrottlerGuard` provider:

```typescript
// src/infra/rate-limiting/rate-limiting.module.ts

// ...
  providers: [
    // {
    //   provide: APP_GUARD,
    //   useClass: ThrottlerGuard,
    // },
  ],
// ...
```

**Important:** Remember to uncomment this block after you have finished load testing to re-enable rate limiting.

### 2. Run the Load Test

Execute the following command from the project root. This will simulate multiple clients trying to book a service concurrently.

```bash
USER_EMAIL=client@example.com USER_PASSWORD=password123 SERVICE_ID=68f74844ea13e09420ea7e55 pnpm test:load
```

The `SERVICE_ID` can be found by running the seed script and inspecting the `services` collection in your database or by using the API to list services for the seeded business. The one provided is a default from the seed data.

## License

UNLICENSED - Private assessment project for Hot Spots Beauty

## Author

Femi Olatubosun - Technical Assessment Submission
