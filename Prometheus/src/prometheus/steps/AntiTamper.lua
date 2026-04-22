-- This Script is Part of the Prometheus Obfuscator by Levno_710
--
-- AntiTamper.lua
--
-- This Script provides an Obfuscation Step, that breaks the script, when someone tries to tamper with it.

local Step = require("prometheus.step")
local RandomStrings = require("prometheus.randomStrings")
local Parser = require("prometheus.parser")
local Enums = require("prometheus.enums")
local logger = require("logger")

local AntiTamper = Step:extend()
AntiTamper.Description = "This Step Breaks your Script when it is modified. This is only effective when using the new VM."
AntiTamper.Name = "Anti Tamper"

AntiTamper.SettingsDescriptor = {
    UseDebug = {
        type = "boolean",
        default = true,
        description = "Use debug library. (Recommended, however scripts will not work without debug library.)",
    },
}

local function generateObfuscatedCheck()
    local checks = {}
    local numChecks = math.random(5, 15)
    
    for i = 1, numChecks do
        local checkType = math.random(1, 6)
        local value = math.random(1, 2^24)
        local expected = math.random(1, 2) == 1
        checks[i] = {type = checkType, value = value, expected = expected}
    end
    
    local codeParts = {}
    local varName = "_" .. RandomStrings.randomString(8)
    local resultVar = "_r" .. RandomStrings.randomString(6)
    
    table.insert(codeParts, string.format("do local %s = true; local %s;", varName, resultVar))
    
    for _, check in ipairs(checks) do
        if check.type == 1 then
            table.insert(codeParts, string.format("%s = %s and (function() return %d + %d == %d end)();", 
                varName, varName, check.value, math.random(1, 1000), check.value + math.random(1, 1000)))
        elseif check.type == 2 then
            table.insert(codeParts, string.format("%s = %s and (function() local a = {...}; return #a == %d end)(%s);", 
                varName, varName, check.value, RandomStrings.randomString(5)))
        elseif check.type == 3 then
            table.insert(codeParts, string.format("%s = %s and (function() local t = {%d}; t[%d] = nil; return t[%d] == nil end)();", 
                varName, varName, check.value, check.value % 5 + 1, check.value % 5 + 1))
        elseif check.type == 4 then
            table.insert(codeParts, string.format("%s = %s and (function() return type(%d) == '%s' end)();", 
                varName, varName, check.value, check.value > 100 and "number" or "number"))
        elseif check.type == 5 then
            table.insert(codeParts, string.format("%s = %s and (function() local x = %d; return x == tonumber(tostring(x)) end)();", 
                varName, varName, check.value))
        else
            table.insert(codeParts, string.format("%s = %s and (function() return #{%d, %d, %d} == 3 end)();", 
                varName, varName, check.value, check.value + 1, check.value + 2))
        end
    end
    
    table.insert(codeParts, string.format("if not %s then while true do end end end", varName))
    
    return table.concat(codeParts, "\n")
end

local function generateAntiDump()
    local codeParts = {}
    local protectName = "_p" .. RandomStrings.randomString(10)
    local dumpName = "_d" .. RandomStrings.randomString(8)
    
    codeParts[#codeParts + 1] = string.format([[
do local %s = debug and debug.getinfo or function() return nil end
local %s = string and string.dump or function() return nil end
local function %s()
    local function %s()
        local function %s()
            local function %s()
                local function %s()
                    local function %s()
                        local function %s()
                            if %s then
                                local info = %s(1, "S")
                                if info and info.what == "C" then
                                    return true
                                end
                            end
                            return false
                        end
                    end
                end
            end
        end
    end
end
end
]], protectName, dumpName, 
RandomStrings.randomString(8), RandomStrings.randomString(8),
RandomStrings.randomString(8), RandomStrings.randomString(8),
RandomStrings.randomString(8), RandomStrings.randomString(8),
protectName, protectName)

    return table.concat(codeParts)
end

local function generateVMCheck()
    return [[
do local _v1 = 0
local _v2 = 0
for _i = 1, 100 do
    _v1 = _v1 + _i
    _v2 = _v2 + (101 - _i)
end
if _v1 ~= _v2 then
    while true do end
end
end
]]
end

function AntiTamper:init(settings) end

function AntiTamper:apply(ast, pipeline)
    if pipeline.PrettyPrint then
        logger:warn(string.format('"%s" cannot be used with PrettyPrint, ignoring "%s"', self.Name, self.Name))
        return ast
    end
    
    local finalCode = {}
    
    finalCode[#finalCode + 1] = generateObfuscatedCheck()
    finalCode[#finalCode + 1] = generateVMCheck()
    
    if self.UseDebug then
        finalCode[#finalCode + 1] = generateAntiDump()
        
        finalCode[#finalCode + 1] = [[
do local _hook = debug and debug.sethook
local _lines = {}
local _lineCount = 0
local _lastLine = 0
if _hook then
    _hook(function(event, line)
        if event == "line" then
            _lineCount = _lineCount + 1
            _lines[line] = (_lines[line] or 0) + 1
            if _lineCount > 5 then
                local _avg = 0
                for _, v in pairs(_lines) do
                    _avg = _avg + v
                end
                _avg = _avg / (#_lines + 1)
                if _avg > 3 then
                    _hook()
                    error("")
                end
            end
            _lastLine = line
        end
    end, "l")
end

local _funcs = {pcall, xpcall, require, loadstring, loadfile}
for _, _f in ipairs(_funcs) do
    if debug and debug.getinfo then
        local _info = debug.getinfo(_f)
        if _info and _info.what ~= "C" then
            while true do end
        end
    end
end

_hook()
end
]]
    end
    
    finalCode[#finalCode + 1] = [[
do local _t = {}
local _mt = {__mode = "k"}
setmetatable(_t, _mt)
for _i = 1, 1000 do
    _t[_i] = _i
end
collectgarbage("collect")
local _c = 0
for _k, _ in pairs(_t) do
    _c = _c + 1
end
if _c > 100 then
    while true do end
end
end

do local _s = debug and debug.getinfo or function() return {what = "C"} end
local _inf = _s(1)
if _inf and _inf.what ~= "C" then
    _G = nil
    error("")
end
end

local _err = error
local _load = load
local _loadstring = loadstring or _load

local _protected = true
local function _check()
    if not _protected then
        _err("")
    end
end

local _wrap = function(f)
    return function(...)
        _check()
        return f(...)
    end
end

pcall = _wrap(pcall)
xpcall = _wrap(xpcall)
load = _wrap(load)
loadstring = _wrap(loadstring or load)

_protected = false
]]
    
    local parsed = Parser:new({LuaVersion = Enums.LuaVersion.Lua51}):parse(table.concat(finalCode, "\n"))
    local doStat = parsed.body.statements[1]
    doStat.body.scope:setParent(ast.body.scope)
    table.insert(ast.body.statements, 1, doStat)
    
    return ast
end

return AntiTamper
