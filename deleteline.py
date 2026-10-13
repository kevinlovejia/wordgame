import csv

# 输入输出文件
input_file = "wordbank1600_out.csv"
output_file = "wordbank1600_out_no_dash.csv"

# 要删除的横线，可以按需增加类型
dash_chars = ["-", "—", "–"]

with open(input_file, "r", encoding="utf-8", newline="") as f_in, \
     open(output_file, "w", encoding="utf-8", newline="") as f_out:
    
    reader = csv.reader(f_in)
    writer = csv.writer(f_out)
    
    for row in reader:
        new_row = []
        for cell in row:
            # 逐个替换所有横线为空
            s = cell
            for d in dash_chars:
                s = s.replace(d, "")
            new_row.append(s)
        writer.writerow(new_row)

print(f"处理完成！已保存到 {output_file}")
print("所有短横线-、长破折号—、半角长横线– 全部删除")
