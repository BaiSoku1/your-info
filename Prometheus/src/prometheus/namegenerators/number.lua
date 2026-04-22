-- This Script is Part of the Prometheus Obfuscator by Levno_710
--
-- namegenerators/number.lua
--
-- This Script provides a function for generation of simple up counting names with hex support

local PREFIX = "_"

return function(id, useHex)
    local suffix = useHex and string.format("%x", id) or tostring(id)
    return PREFIX .. suffix
end
