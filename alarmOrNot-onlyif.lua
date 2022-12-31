Base = {num = 0}

function Base:new(o)
    o = o or {}
    self.__index = self
    setmetatable(o, self)
    return o
end

function Base:print()
    print("Base:")
    print(self.num)
end

SpecialBase = Base:new()

function SpecialBase:print()
    print("SpecialBase:")
    print(self.num)
end

s = SpecialBase:new({num = 10})

s:print()
