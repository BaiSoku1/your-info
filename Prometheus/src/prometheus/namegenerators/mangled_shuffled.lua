-- This Script is Part of the Prometheus Obfuscator by Levno_710
--
-- namegenerators/mangled_shuffled.lua
--
-- This Script provides a function for generation of mangled names with shuffled character order

local util = require("prometheus.util")

local VarDigits = util.chararray("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_")
local VarStartDigits = util.chararray("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ")

local function generateName(id)
    local chars = {}
    local d = id % #VarStartDigits + 1
    id = math.floor(id / #VarStartDigits)
    chars[1] = VarStartDigits[d]
    
    local idx = 2
    while id > 0 do
        local e = id % #VarDigits + 1
        id = math.floor(id / #VarDigits)
        chars[idx] = VarDigits[e]
        idx = idx + 1
    end
    
    return table.concat(chars)
end

local function prepare()
    util.shuffle(VarDigits)
    util.shuffle(VarStartDigits)
end

return { generateName = generateName, prepare = prepare }
