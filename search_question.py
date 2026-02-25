
try:
    with open('playposit_output.html', 'r', encoding='utf-8') as f:
        for i, line in enumerate(f):
            if 'Submit' in line:
                print(f'{i}: {line.strip()}')
            if 'Retry' in line:
                print(f'{i}: {line.strip()}')
            if 'Continue' in line:
                print(f'{i}: {line.strip()}')
            if 'checkbox' in line.lower():
                print(f'{i}: {line.strip()}')
            if 'radio' in line.lower():
                print(f'{i}: {line.strip()}')
except Exception as e:
    print(f"Error: {e}")
