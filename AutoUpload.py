import subprocess
import datetime
import os
import re
import platform # OS 확인용

# --- 설정 ---
PROJECT_PATH = "C:/Users/user/my-ai-assistant"
REPO_URL = "https://github.com/sechalyeol/my-ai-assistant.git"

# 제외할 디렉토리 (OS에 맞게 자동 변환됨)
EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'public/models', 'static/models']
# 제외할 파일
EXCLUDE_FILES = ['AutoUpload.py', 'package-lock.json', 'yarn.lock']

# 파일 확장자별 주석 템플릿
COMMENT_MAP = {
    '.js': '// Last Updated: {}',
    '.jsx': '// Last Updated: {}',
    '.cjs': '// Last Updated: {}',
    '.py': '# Last Updated: {}',
    '.css': '/* Last Updated: {} */', # CSS 추가
}

def run_command(command, cwd):
    print(f"Executing: {' '.join(command)}")
    # Windows에서 한글 깨짐 방지를 위해 encoding 설정
    result = subprocess.run(command, cwd=cwd, shell=True, capture_output=True, text=True, encoding='utf-8')
    if result.returncode != 0:
        print(f"Error: {result.stderr}")
        return None
    else:
        print(result.stdout)
        return result.stdout

def update_file_timestamps(project_path, now_str):
    print("\n--- Updating file timestamps ---")
    
    # 1. 윈도우 호환성을 위해 제외 경로들을 OS 표준 경로로 변환
    normalized_excludes = [os.path.normpath(p) for p in EXCLUDE_DIRS]

    for root, dirs, files in os.walk(project_path):
        # 2. 디렉토리 제외 로직 (윈도우 경로 호환 수정)
        # 현재 탐색 중인 폴더의 상대 경로 계산
        rel_root = os.path.relpath(root, project_path)
        
        # dirs 리스트를 수정하여 walk가 제외된 폴더로 들어가지 않게 함
        # 리스트를 복사하여 순회하면서 원본을 수정
        for d in list(dirs):
            # 현재 폴더 이름이 제외 목록에 있거나
            if d in normalized_excludes:
                dirs.remove(d)
                continue
            
            # 전체 상대 경로(예: public\models)가 제외 목록에 있는지 확인
            full_rel_path = os.path.normpath(os.path.join(rel_root, d))
            if full_rel_path in normalized_excludes:
                dirs.remove(d)

        for file in files:
            if file in EXCLUDE_FILES:
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
                    # 기존 주석을 찾기 위한 정규식
                    regex_pattern = re.compile(rf'^{pattern_start}.*{pattern_end}\s*$')

                    try:
                        # utf-8-sig는 윈도우 메모장 등과의 호환성을 위함
                        with open(file_path, 'r+', encoding='utf-8-sig') as f:
                            lines = f.readlines()
                            if not lines: continue # 빈 파일 건너뜀

                            if regex_pattern.match(lines[0]):
                                lines[0] = update_comment + '\n'
                                # print(f"Updated: {file}") # 너무 많으면 주석 처리
                            else:
                                lines.insert(0, update_comment + '\n')
                                print(f"Stamped: {file}")
                            
                            f.seek(0)
                            f.writelines(lines)
                            f.truncate()
                    except Exception as e:
                        print(f"Skipped {file}: {e}")

def main():
    # 0. Git 초기화 확인 (없으면 init 및 remote 추가)
    if not os.path.exists(os.path.join(PROJECT_PATH, ".git")):
        print("Initializing Git repository...")
        run_command(["git", "init"], cwd=PROJECT_PATH)
        run_command(["git", "remote", "add", "origin", REPO_URL], cwd=PROJECT_PATH)

    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    commit_message = f"Auto-commit: {now}"
    
    # 1. 파일 타임스탬프 업데이트
    update_file_timestamps(PROJECT_PATH, now)
    
    # 2. Staging
    print("\n--- 1. Staging changes ---")
    if run_command(["git", "add", "."], cwd=PROJECT_PATH) is None: 
        return

    # 제외하고 싶은 폴더가 있다면 reset 수행 (윈도우 호환 경로)
    # 여기서는 예시로 static/models를 놔두지만, 필요하면 활성화
    # subprocess.run(["git", "reset", os.path.normpath("static/models")], cwd=PROJECT_PATH, shell=True)
        
    print(f"\n--- 2. Committing ---")
    # 커밋할 게 있는지 확인 후 커밋
    status_output = run_command(["git", "status", "--porcelain"], cwd=PROJECT_PATH)
    
    if status_output and status_output.strip():
        commit_result = run_command(["git", "commit", "-m", commit_message], cwd=PROJECT_PATH)
        if commit_result is None:
            print("Commit failed.")
            return
    else:
        print("Nothing to commit.")

    print("\n--- 3. Pushing to GitHub ---")
    # HEAD:main -> 현재 브랜치(무엇이든)를 원격의 main으로 푸시
    push_command = ["git", "push", "-u", "origin", "HEAD:main", "--force"]
    
    if run_command(push_command, cwd=PROJECT_PATH) is None: 
        print("❌ Push failed. Check your internet or repo permissions.")
        return
        
    print("\n✅ All Done! Uploaded to GitHub.")

if __name__ == "__main__":
    main()