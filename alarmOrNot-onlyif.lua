t = {time = 10}

function t.addTime(self, time)
    self.time = self.time + time
end

function t:setTime(time)
    self.time = time
end

t:addTime(20)
print(t.time)

t.setTime(t, 15)
print(t.time)
