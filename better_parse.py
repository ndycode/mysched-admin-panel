import re

def parse_restore_file(input_file, output_file):
    with open(input_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    restored_lines = []
    current_line = ""
    
    # Regex to match the line number and dash prefix: e.g., "       1 -"
    # It seems to be whitespace, number, whitespace, dash
    line_start_pattern = re.compile(r'^\s+(\d+)\s-(.*)$')
    
    # The prefix length seems to be constant for the continuation lines.
    # Based on "       1 -", it looks like about 10 characters.
    # Let's try to detect the indentation of the content from the first match.
    content_start_index = -1

    for line in lines:
        # Remove trailing newline
        line_content = line.rstrip('\n')
        
        match = line_start_pattern.match(line_content)
        if match:
            # Found a new line
            if current_line is not None:
                restored_lines.append(current_line)
            
            # Start new line
            # The content is in group 2
            current_line = match.group(2)
            
            # Determine where the content starts (for continuation lines)
            # The match.start(2) gives the index where the content begins
            if content_start_index == -1:
                content_start_index = match.start(2)
        else:
            # Continuation line
            # We need to strip the prefix padding.
            # Assuming the padding is spaces up to content_start_index
            if content_start_index != -1:
                if len(line_content) >= content_start_index:
                    continuation = line_content[content_start_index:]
                    current_line += continuation
                else:
                    # Line is shorter than prefix? Maybe empty line or just newline?
                    # If it's just empty, maybe we shouldn't add anything or just add what's there
                    current_line += line_content.strip() 
            else:
                # If we haven't found a start line yet, maybe skip or just append
                pass

    # Append the last line
    if current_line:
        restored_lines.append(current_line)

    # The first item might be empty if the loop started with current_line="" and first line was a match
    # But we append current_line only when we find a NEW match.
    # So the first empty string is not appended.
    # Wait, "if current_line is not None: restored_lines.append(current_line)"
    # Initial current_line is "". So it appends "" at the first match.
    # We should filter that out.
    
    final_content = '\n'.join(restored_lines[1:]) # Skip the initial empty string

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(final_content)

if __name__ == "__main__":
    parse_restore_file('restore.txt', 'src/app/admin/page.tsx')
