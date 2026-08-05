import os
import re

def check_imports(directory):
    files = {}
    for root, dirs, filenames in os.walk(directory):
        for f in filenames:
            if f.endswith('.jsx') or f.endswith('.js'):
                path = os.path.join(root, f)
                files[path.replace('\\', '/')] = True
    
    import_pattern = re.compile(r"import\s+.*?from\s+['\"](.*?)['\"]")
    
    for root, dirs, filenames in os.walk(directory):
        for f in filenames:
            if f.endswith('.jsx') or f.endswith('.js'):
                path = os.path.join(root, f)
                with open(path, 'r', encoding='utf-8') as file:
                    content = file.read()
                    imports = import_pattern.findall(content)
                    for imp in imports:
                        if imp.startswith('.'):
                            # Resolve relative path
                            resolved_dir = os.path.dirname(path).replace('\\', '/')
                            resolved_path = os.path.normpath(os.path.join(resolved_dir, imp)).replace('\\', '/')
                            # Check if the resolved path exactly matches any file (with extensions)
                            matched = False
                            for ext in ['', '.js', '.jsx']:
                                test_path = resolved_path + ext
                                if test_path in files:
                                    matched = True
                                    break
                            
                            if not matched:
                                # Check if it matches case-insensitively
                                for ext in ['', '.js', '.jsx']:
                                    test_path = resolved_path + ext
                                    for k in files:
                                        if k.lower() == test_path.lower():
                                            print(f"CASE MISMATCH in {path}: imported {imp} which resolves to {test_path} but actual file is {k}")
                                            break
                            
check_imports('frontend/src')
