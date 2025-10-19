-- KEYS[1] = bookings:<businessId>:<oldDate>
-- KEYS[2] = bookings:<businessId>:<newDate>
-- ARGV[1] = oldStart (epoch ms)
-- ARGV[2] = oldEnd (epoch ms)
-- ARGV[3] = newStart (epoch ms)
-- ARGV[4] = newEnd (epoch ms)
-- ARGV[5] = bookingId

local oldKey = KEYS[1]
local newKey = KEYS[2]
local oldStart = tonumber(ARGV[1])
local oldEnd = tonumber(ARGV[2])
local newStart = tonumber(ARGV[3])
local newEnd = tonumber(ARGV[4])
local bookingId = ARGV[5]

-- Check if new slot conflicts with any OTHER bookings
local bookings = redis.call('ZRANGEBYSCORE', newKey, '-inf', newEnd)

for _, existingBookingId in ipairs(bookings) do
    -- Skip our own booking
    if existingBookingId ~= bookingId then
        local existingStart = tonumber(redis.call('ZSCORE', newKey, existingBookingId))
        local existingEnd = tonumber(redis.call('HGET', 'booking_end_times', existingBookingId))

        -- Check for overlap: existing booking overlaps with new slot
        if existingEnd > newStart and existingStart < newEnd then
            return 0 -- Conflict detected
        end
    end
end

-- No conflicts found, perform atomic swap
-- Step 1: Remove old booking (if different date or doesn't overlap)
if oldKey ~= newKey or oldStart ~= newStart or oldEnd ~= newEnd then
    redis.call('ZREM', oldKey, bookingId)
end

-- Step 2: Add/Update new booking position
redis.call('ZADD', newKey, newStart, bookingId)
redis.call('HSET', 'booking_end_times', bookingId, tostring(newEnd))

return 1 -- Success
