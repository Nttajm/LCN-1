weight_before = input('weight: ')
k_or_l = input('(L)bs or (k)g: ')
weight = int(weight_before)

if k_or_l.lower() == 'l':
    weight = weight * 2.205
    print(f'you are {weight} kgs')
elif k_or_l.lower() == 'k':
    weight = weight // 2.205
    print(f'you are {weight} lbs')