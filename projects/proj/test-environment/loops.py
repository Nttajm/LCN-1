secret_number = 9
neg = 0
guess_limit = 3
while neg < guess_limit:
    guess = int(input('make a guess '))
    neg += 1
    if guess == secret_number: 
        print('you win')
        break
else: 
    print('sorry, youre wrong')
    
    
    