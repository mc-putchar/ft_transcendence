
"""
A power of 2 in binary is a 1 followed by just 0s. Subtracting 1 flips all the 0s
to 1s. So the bitwise & of the two numbers is 0 if n is a power of 2
Ex:
128	->	10000000
127	->	01111111
&	->	00000000 
"""
def is_power_of_two(n):
	return n > 1 and (n & (n - 1)) == 0

"""
Find the bit position of the highest non-zero bit, bitshift to the left those many
bits to find the closest power of 2 smaller than the given number
"""
def closest_lower_power_of_2(n):
	if n == 0:
		return 0
	if is_power_of_two(n):
		return n
	msb_position = 0 # Most Significant Bit
	while n > 1:
		n >>= 1
		msb_position += 1
	return 1 << msb_position

def closest_higher_power_of_2(n):
	if n <= 1:
		return 1
	if is_power_of_two(n):
		return n
	msb_position = 1 # Most Significant Bit
	while n > 1:
		n >>= 1
		msb_position += 1
	return 1 << msb_position

def print_groups(groups):
	for group in groups:
		print([str(player) for player in group])
