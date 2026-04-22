-- This Script is Part of the Prometheus Obfuscator by Levno_710
--
-- namegenerators/il.lua
--
-- This Script provides a function for generation of weird names consisting of I, l and 1

local MIN_CHARACTERS = 5
local MAX_INITIAL_CHARACTERS = 10

local util = require("prometheus.util")

local offset = 0
local VarDigits = util.chararray("Il1")
local VarStartDigits = util.chararray("Il")

local function generateName(id)
    id = id + offset
    local parts = {}
    local d = id % #VarStartDigits + 1
    id = math.floor(id / #VarStartDigits)
    parts[1] = VarStartDigits[d]
    
    local idx = 2
    while id > 0 do
        local e = id % #VarDigits + 1
        id = math.floor(id / #VarDigits)
        parts[idx] = VarDigits[e]
        idx = idx + 1
    end
    
    return table.concat(parts)
end

local function prepare()
    util.shuffle(VarDigits)
    util.shuffle(VarStartDigits)
    offset = math.random(3 ^ MIN_CHARACTERS, 3 ^ MAX_INITIAL_CHARACTERS)
end

return { generateName = generateName, prepare = prepare }
