-- This Script is Part of the Prometheus Obfuscator by Levno_710
--
-- namegenerators/il.lua
--
-- This Script provides a function for generation of weird names consisting of I, l and 1

local MIN_CHARACTERS = 5
local MAX_INITIAL_CHARACTERS = 10

local util = require("prometheus.util")

local VarDigits = util.chararray("Il1")
local VarStartDigits = util.chararray("Il")

local offset = 0

local function generateName(id)
    local num = id + offset
    local parts = { VarStartDigits[num % #VarStartDigits + 1] }
    num = math.floor(num / #VarStartDigits)
    
    while num > 0 do
        table.insert(parts, 1, VarDigits[num % #VarDigits + 1])
        num = math.floor(num / #VarDigits)
    end
    
    return table.concat(parts)
end

local function prepare()
    util.shuffle(VarDigits)
    util.shuffle(VarStartDigits)
    -- Ensure minimum length by setting offset appropriately
    local minVal = #VarStartDigits * (#VarDigits ^ (MIN_CHARACTERS - 1))
    local maxVal = #VarStartDigits * (#VarDigits ^ (MAX_INITIAL_CHARACTERS - 1))
    offset = math.random(minVal, maxVal)
end

return { generateName = generateName, prepare = prepare }
