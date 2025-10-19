-- KEYS[1] = bookings:<businessId>:<date>
-- ARGV[1] = dayStart (epoch ms) - e.g., 09:00
-- ARGV[2] = dayEnd (epoch ms) - e.g., 17:00
-- ARGV[3] = serviceDuration (ms) - e.g., 3600000 (60 min)
-- ARGV[4] = excludeBookingId - booking to exclude from availability calculation (for reschedule)

-- Get all bookings for the day (including those that start before dayStart but may overlap)
local bookings = redis.call('ZRANGEBYSCORE', KEYS[1], '-inf', ARGV[2])

local gaps = {}
local cursor = tonumber(ARGV[1])
local totalTimeNeeded = tonumber(ARGV[3])
local excludeBookingId = ARGV[4]

-- Iterate through bookings to find gaps
for _, bookingId in ipairs(bookings) do
    -- Skip the booking being rescheduled
    if bookingId ~= excludeBookingId then
        local bookingStart = tonumber(redis.call('ZSCORE', KEYS[1], bookingId))
        local bookingEnd = tonumber(redis.call('HGET', 'booking_end_times', bookingId))

        -- Skip bookings that end before our day starts
        if bookingEnd > cursor then
            -- Calculate gap between cursor and this booking
            local gapDuration = bookingStart - cursor

            if gapDuration >= totalTimeNeeded then
                table.insert(gaps, { start = cursor, ["end"] = bookingStart, duration = gapDuration })
            end

            -- Move cursor past this booking
            cursor = math.max(cursor, bookingEnd)
        end
    end
end

-- Check final gap after last booking
local finalGapDuration = tonumber(ARGV[2]) - cursor
if finalGapDuration >= totalTimeNeeded then
    table.insert(gaps, { start = cursor, ["end"] = tonumber(ARGV[2]), duration = finalGapDuration })
end

return cjson.encode(gaps)
