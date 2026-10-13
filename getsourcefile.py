import os
import subprocess
from pathlib import Path
import sys
def compress_and_decompress_with_7z():
    """
    使用7z压缩当前文件夹所有内容，然后解压覆盖
    """
    # 获取当前目录
    current_dir = Path.cwd()
    
    # 检查7z是否安装
    try:
        subprocess.run(['7z'], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("错误：未找到7z命令，请先安装7-Zip并添加到系统PATH")
        return
    
    # 压缩文件名
    archive_name = "backup.7z"
    archive_path = current_dir / archive_name
    
    print(f"正在压缩当前目录到 {archive_name}...")
    
    # 压缩命令：7z a -t7z -mx=5 -y archive_name *
    # a: 添加到压缩文件
    # -t7z: 指定格式为7z
    # -mx=5: 压缩级别5（标准压缩）
    # -y: 覆盖所有询问
    compress_cmd = [
        '7z', 'a', 
        '-t7z',           # 压缩格式
        '-mx=5',          # 压缩级别
        '-y',             # 自动覆盖
        str(archive_path), # 压缩文件路径
        '*'               # 所有文件
    ]
    
    try:
        # 执行压缩
        result = subprocess.run(compress_cmd, cwd=current_dir, check=True)
        print("压缩完成！")
        
        # 解压命令：7z x -y archive_name
        # x: 解压并保持目录结构
        print(f"正在解压 {archive_name} 覆盖原文件...")
        
        decompress_cmd = [
            '7z', 'x',
            '-y',             # 自动覆盖
            str(archive_path)  # 压缩文件路径
        ]
        
        result = subprocess.run(decompress_cmd, cwd=current_dir, check=True)
        print("解压完成！文件已覆盖。")
        
    except subprocess.CalledProcessError as e:
        print(f"操作失败：{e}")
    finally:
        # 可选：删除压缩文件
        if archive_path.exists():
            archive_path.unlink()
            print("临时压缩文件已删除。")


os.chdir(sys.path[0])
# 执行函数
compress_and_decompress_with_7z()