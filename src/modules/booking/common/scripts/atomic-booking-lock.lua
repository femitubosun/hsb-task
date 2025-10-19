-- KEYS[1] = bookings:<businessId>:<date>
-- ARGV[1] = startTimestamp (epoch ms)
-- ARGV[2] = endTimestamp (epoch ms)
-- ARGV[3] = bookingId

-- Find all bookings that start before or at our end time
local candidates = redis.call('ZRANGEBYSCORE', KEYS[1], '-inf', ARGV[2])

-- Check each candidate for overlap
for _, id in ipairs(candidates) do
    local existingEnd = redis.call('HGET', 'booking_end_times', id)

    -- Overlap exists if existing booking ends after our start time
    if existingEnd and tonumber(existingEnd) > tonumber(ARGV[1]) then
        return 0 -- Conflict detected
    end
end

-- No conflicts, reserve the slot
redis.call('ZADD', KEYS[1], ARGV[1], ARGV[3])
redis.call('HSET', 'booking_end_times', ARGV[3], ARGV[2])
return 1 -- Success
