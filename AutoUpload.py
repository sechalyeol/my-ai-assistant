import subprocess
import datetime
import os
import re
import platform # OS 확인용

# --- 설정 ---
PROJECT_PATH = "C:/Users/user/my-ai-assistant"
REPO_URL = "https://github.com/sechalyeol/my-ai-assistant.git"

# 제외할 디렉토리 (OS에 맞게 자동 변환됨)
EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'public/models', 'static/models', 'build']
# 제외할 파일 (여기에 .env 추가됨)
EXCLUDE_FILES = ['AutoUpload.py', 'package-lock.json', 'yarn.lock', '.env', '.gitignore']

# 파일 확장자별 주석 템플릿
COMMENT_MAP = {
    '.js': '// Last Updated: {}',
    '.jsx': '// Last Updated: {}',
    '.cjs': '// Last Updated: {}',
    '.py': '# Last Updated: {}',
    '.css': '/* Last Updated: {} */', 
}

def run_command(command, cwd):
    print(f"Executing: {' '.join(command)}")
    # Windows에서 한글 깨짐 방지를 위해 encoding 설정
    try:
        result = subprocess.run(command, cwd=cwd, shell=True, capture_output=True, text=True, encoding='utf-8')
        if result.returncode != 0:
            print(f"Error: {result.stderr}")
            return None
        else:
            print(result.stdout)
            return result.stdout
    except Exception as e:
        print(f"Command Execution Failed: {e}")
        return None

def manage_gitignore(project_path):
    """
    .gitignore 파일을 확인하고 .env가 없으면 추가합니다.
    """
    print("\n--- Checking .gitignore ---")
    gitignore_path = os.path.join(project_path, ".gitignore")
    env_ignored = False
    
    # .gitignore 파일이 있으면 읽어서 확인
    if os.path.exists(gitignore_path):
        with open(gitignore_path, "r", encoding="utf-8") as f:
            content = f.read()
            if ".env" in content:
                env_ignored = True
    
    # .env가 없거나 파일이 없으면 추가
    if not env_ignored:
        print("Adding .env to .gitignore...")
        with open(gitignore_path, "a", encoding="utf-8") as f:
            f.write("\n.env\n") # .env 추가
            f.write("node_modules/\n") # node_modules도 안전하게 추가
            f.write("dist/\n")
    else:
        print(".env is already ignored.")

def remove_cached_env(project_path):
    """
    이미 원격 저장소에 올라간 .env를 제거합니다 (로컬 파일은 유지).
    """
    print("\n--- Removing .env from Git cache ---")
    # --cached 옵션은 원격 저장소에서만 지우고 로컬 파일은 남김
    run_command(["git", "rm", "--cached", ".env"], cwd=project_path)

def update_file_timestamps(project_path, now_str):
    print("\n--- Updating file timestamps ---")
    
    normalized_excludes = [os.path.normpath(p) for p in EXCLUDE_DIRS]

    for root, dirs, files in os.walk(project_path):
        rel_root = os.path.relpath(root, project_path)
        
        for d in list(dirs):
            if d in normalized_excludes:
                dirs.remove(d)
                continue
            
            full_rel_path = os.path.normpath(os.path.join(rel_root, d))
            if full_rel_path in normalized_excludes:
                dirs.remove(d)

        for file in files:
            if file in EXCLUDE_FILES:
                continue
            
            # .env 파일은 절대 건드리지 않음
            if file == '.env':
                continue

            file_path = os.path.join(root, file)
            _, file_ext = os.path.splitext(file)

            if file_ext in COMMENT_MAP:
                comment_template = COMMENT_MAP.get(file_ext)
                if comment_template:
                    update_comment = comment_template.format(now_str)
                    
                    parts = comment_template.split('{}')
                    pattern_start = re.escape(parts[0])
                    pattern_end = re.escape(parts[1]) if len(parts) > 1 else ''
                    regex_pattern = re.compile(rf'^{pattern_start}.*{pattern_end}\s*$')

                    try:
                        with open(file_path, 'r+', encoding='utf-8-sig') as f:
                            lines = f.readlines()
                            if not lines: continue 

                            if regex_pattern.match(lines[0]):
                                lines[0] = update_comment + '\n'
                            else:
                                lines.insert(0, update_comment + '\n')
                                print(f"Stamped: {file}")
                            
                            f.seek(0)
                            f.writelines(lines)
                            f.truncate()
                    except Exception as e:
                        print(f"Skipped {file}: {e}")

def main():
    # 0. Git 초기화 확인
    if not os.path.exists(os.path.join(PROJECT_PATH, ".git")):
        print("Initializing Git repository...")
        run_command(["git", "init"], cwd=PROJECT_PATH)
        run_command(["git", "remote", "add", "origin", REPO_URL], cwd=PROJECT_PATH)

    # 1. 보안 설정 (.gitignore 처리 및 캐시 삭제)
    manage_gitignore(PROJECT_PATH)
    remove_cached_env(PROJECT_PATH) # 이미 올라간 .env 삭제 시도

    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    commit_message = f"Auto-commit: {now}"
    
    # 2. 파일 타임스탬프 업데이트
    update_file_timestamps(PROJECT_PATH, now)
    
    # 3. Staging
    print("\n--- 1. Staging changes ---")
    if run_command(["git", "add", "."], cwd=PROJECT_PATH) is None: 
        return
        
    print(f"\n--- 2. Committing ---")
    status_output = run_command(["git", "status", "--porcelain"], cwd=PROJECT_PATH)
    
    if status_output and status_output.strip():
        commit_result = run_command(["git", "commit", "-m", commit_message], cwd=PROJECT_PATH)
        if commit_result is None:
            print("Commit failed.")
            return
    else:
        print("Nothing to commit.")

    print("\n--- 3. Pushing to GitHub ---")
    push_command = ["git", "push", "-u", "origin", "HEAD:main", "--force"]
    
    if run_command(push_command, cwd=PROJECT_PATH) is None: 
        print("❌ Push failed. Check your internet or repo permissions.")
        return
        
    print("\n✅ All Done! Uploaded to GitHub.")

if __name__ == "__main__":
    main()