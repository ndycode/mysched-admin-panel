import re

input_file = 'restore.txt'
output_file = 'src/app/admin/page.tsx'

with open(input_file, 'r') as f:
    lines = f.readlines()

final_lines = []
current_line = None

# Regex to match the line number prefix: whitespace, digits, whitespace, dash
prefix_pattern = re.compile(r'^\s*\d+\s*-(.*)', re.DOTALL)

for line in lines:
    # Remove trailing newline for processing
    line_content = line.rstrip('\n')
    
    match = prefix_pattern.match(line_content)
    if match:
        # If we have a previous line accumulating, push it
        if current_line is not None:
             final_lines.append(current_line)
        # Start new line
        current_line = match.group(1)
    else:
        # Continuation line
        if current_line is not None:
            # lstrip only the indentation, keep the content
            current_line += line_content.lstrip()

# Append the last line
if current_line is not None:
    final_lines.append(current_line)

with open(output_file, 'w') as f:
    f.write('\n'.join(final_lines))
