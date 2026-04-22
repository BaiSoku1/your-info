-- This Script is Part of the Prometheus Obfuscator by Levno_710
--
-- namegenerators/mangled.lua
--
-- This Script provides a function for generation of mangled names


local util = require("prometheus.util")

local VarDigits = util.chararray("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_")
local VarStartDigits = util.chararray("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ")

return function(id)
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
