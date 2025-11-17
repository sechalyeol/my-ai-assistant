import subprocess
import datetime
import os
import re

# --- 설정 (이 부분을 자신의 환경에 맞게 수정하세요) ---
PROJECT_PATH = "C:/Users/user/my-ai-assistant"  # Git 프로젝트 폴더 경로
REPO_URL = "https://github.com/sechalyeol/my-ai-assistant.git" # 본인의 GitHub 저장소 주소

# 👇👇 [필수 추가] 제외 목록 및 주석 템플릿 👇👇
EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'public/models', 'static/models'] 
EXCLUDE_FILES = ['AutoUpload.py', 'package-lock.json', 'yarn.lock'] # 자기 자신과 락 파일 제외

# 파일 확장자별 주석 템플릿 ({}에 현재 시간이 들어갑니다)
COMMENT_MAP = {
    '.js': '// Last Updated: {}',
    '.jsx': '// Last Updated: {}',
    '.cjs': '// Last Updated: {}',
    '.py': '# Last Updated: {}',
    # 필요한 다른 파일 형식 (CSS, HTML 등)을 추가할 수 있습니다.
}

def run_command(command, cwd):
    print(f"Executing: {' '.join(command)}")
    result = subprocess.run(command, cwd=cwd, shell=True, capture_output=True, text=True, encoding='utf-8')
    if result.returncode != 0:
        print(f"Error: {result.stderr}")
        return None
    else:
        print(result.stdout)
        return result.stdout

def update_file_timestamps(project_path, now_str):
    print("\n--- Updating file timestamps ---")
    
    # ⚠️ 수정된 부분: EXCLUDE_DIRS에 전체 경로 또는 서브 디렉토리 이름을 모두 고려하여 제외합니다.
    # 예: 'static/models'가 EXCLUDE_DIRS에 있다면, 'static' 내에서 'models'를 건너뜁니다.
    for root, dirs, files in os.walk(project_path):
        # 현재 디렉토리가 project_path/static이라고 가정할 때, 
        # dirs에는 ['models']가 있습니다.
        
        # 제외 목록에 있는 디렉토리들을 dirs 리스트에서 제거합니다.
        # os.path.relpath를 사용하여 root를 기준으로 상대 경로를 만듭니다.
        dirs_to_exclude_in_root = [
            d for d in dirs 
            if d in EXCLUDE_DIRS or os.path.join(os.path.relpath(root, project_path), d) in EXCLUDE_DIRS
        ]
        
        # dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS] # 기존 코드
        dirs[:] = [d for d in dirs if d not in dirs_to_exclude_in_root] # ⚠️ 수정된 코드
        
        for file in files:
            if file in EXCLUDE_FILES:
                continue

            file_path = os.path.join(root, file)
            _, file_ext = os.path.splitext(file)

            if file_ext in COMMENT_MAP:
                comment_template = COMMENT_MAP.get(file_ext)
                # 템플릿이 비어있지 않은 경우에만 주석 추가 로직 실행
                if comment_template:
                    update_comment = comment_template.format(now_str)
                    
                    parts = comment_template.split('{}')
                    pattern_start = re.escape(parts[0])
                    pattern_end = re.escape(parts[1]) if len(parts) > 1 else ''
                    regex_pattern = re.compile(rf'^{pattern_start}.*{pattern_end}\s*$')

                    try:
                        with open(file_path, 'r+', encoding='utf-8-sig') as f:
                            lines = f.readlines()
                            if lines and regex_pattern.match(lines[0]):
                                lines[0] = update_comment + '\n'
                                print(f"Updated timestamp in: {file_path}")
                            else:
                                lines.insert(0, update_comment + '\n')
                                print(f"Added timestamp to: {file_path}")
                            
                            f.seek(0)
                            f.writelines(lines)
                            f.truncate()
                    except Exception as e:
                        print(f"Could not process file {file_path}: {e}")

def main():
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    commit_message = f"Auto-commit: {now}"
    
    # 1. 파일 타임스탬프 업데이트 (EXCLUDE_DIRS, EXCLUDE_FILES 적용됨)
    update_file_timestamps(PROJECT_PATH, now)
    
    # 2. Staging all changes (static/models 제외)
    print("\n--- 1. Staging all changes (excluding static/models) ---")
    
    # 먼저 모든 파일을 Staging 합니다.
    if run_command(["git", "add", "."], cwd=PROJECT_PATH) is None: 
        return
        
    # 'static/models' 폴더의 변경 사항만 Staging 목록에서 제외(Unstage)합니다.
    # '--'는 경로와 옵션을 구분합니다.
    if run_command(["git", "reset", "static/models"], cwd=PROJECT_PATH) is None: 
        # git reset이 실패하면 (예: 해당 파일이 변경되지 않아 reset할 내용이 없을 때) 
        # 오류로 간주하지 않고 다음 단계로 진행합니다.
        pass 
        
    print(f"\n--- 2. Committing with message: '{commit_message}' ---")
    commit_result = run_command(["git", "commit", "-m", commit_message], cwd=PROJECT_PATH)
    
    if commit_result is None:
        status_output = run_command(["git", "status", "--porcelain"], cwd=PROJECT_PATH)
        if status_output: # Staged 되지 않은 파일이 남아있을 경우 (static/models)
             print("\n⚠️ Commit failed. Checking staged status.")
             # git status --porcelain 결과에 staged된 파일이 없음을 확인
             staged_files = [line for line in status_output.splitlines() if line.startswith('M') or line.startswith('A')]
             if not staged_files:
                 print("No files were staged for commit.")
             else:
                 return # staged 파일이 있는데 commit이 실패하면 오류로 간주
        else: # 변경 사항이 없어서 commit이 안 되는 경우
            print("No changes to commit (after excluding static/models).")
            # Unstaged 된 static/models 파일들은 그대로 남아있게 됩니다.
            
    print("\n--- 3. Pushing to GitHub ---")
    push_command = ["git", "push", "-u", "origin", "master:main", "--force"]
    if run_command(push_command, cwd=PROJECT_PATH) is None: return
    print("\n✅ Successfully updated timestamps and uploaded to GitHub!")

if __name__ == "__main__":
    main()
