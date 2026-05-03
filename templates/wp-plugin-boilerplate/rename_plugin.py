import os
import re


# Constants for the old and new plugin names
OLD_NAME = 'boilerplate'
NEW_NAME = 'akkomq'

OLD_NAME_CAPITALIZED = 'Boilerplate'
NEW_NAME_CAPITALIZED = 'Akkomq'

OLD_CONSTANT_PREFIX = 'ORPHIC_PLUGIN_BOILERPLATE'
NEW_CONSTANT_PREFIX = 'ORPHIC_PLUGIN_AKKOMQ'

OLD_CLASS_PREFIX = 'Orphic_Plugin_Boilerplate'
NEW_CLASS_PREFIX = 'Orphic_Plugin_Akkomq'

OLD_SLUG = 'orphic-plugin-boilerplate'
NEW_SLUG = 'orphic-plugin-akkomq'


def rename_files_and_update_content(directory):
    total_files = sum([len(files) for _, _, files in os.walk(directory)])
    processed_files = 0

    for root, dirs, files in os.walk(directory):
        if '.git' in dirs:
            dirs.remove('.git')
        
        for file in files:
            old_path = os.path.join(root, file)
            
            # Condition to skip processing this file
            if file == 'rename_plugin.py':
                print(f"Skipping {file}")
                continue
            
            new_file = file.replace(OLD_NAME, NEW_NAME).replace(OLD_NAME.capitalize(), NEW_NAME.capitalize())
            new_path = os.path.join(root, new_file)
            
            if old_path != new_path:
                os.rename(old_path, new_path)
            
            # Update file content
            with open(new_path, 'r') as f:
                content = f.read()
            
            # Replace all occurrences, case-sensitive for constants, case-insensitive for others
            content = re.sub(OLD_CONSTANT_PREFIX, NEW_CONSTANT_PREFIX, content)
            content = re.sub(OLD_CLASS_PREFIX, NEW_CLASS_PREFIX, content, flags=re.IGNORECASE)
            content = re.sub(OLD_SLUG, NEW_SLUG, content, flags=re.IGNORECASE)
            content = re.sub(OLD_NAME, NEW_NAME, content, flags=re.IGNORECASE)
            content = re.sub(OLD_NAME_CAPITALIZED, NEW_NAME_CAPITALIZED, content)
            
            # Write updated content back to file
            with open(new_path, 'w') as f:
                f.write(content)
            
            processed_files += 1
            progress = (processed_files / total_files) * 100
            print(f"🚀 Renamed and updated: {old_path}\n🚀 -> {new_path}\n✅ -> {progress:.2f}%\n")
    print(f"Done 100% enjoy !")
# Use the current working directory as the plugin directory
plugin_directory = os.getcwd()
rename_files_and_update_content(plugin_directory)
