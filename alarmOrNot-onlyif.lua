local a = 3
function alarmOrNot(a)
    if(labelA + labelB + labelC == a)
    then
        local a = 1
        setValue(buttonAlarm, a)
    else
        local a = 0
        setValue(buttonAlarm, a)
    end
    print(a)  
end

alarmOrNot(a)
