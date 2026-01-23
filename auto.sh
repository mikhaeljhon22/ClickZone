# Di folder repo Anda, jalankan:
echo "=== START OF ALL CODE ===" > all_code.txt
echo "" >> all_code.txt

# Loop semua file .go
for file in $(find . -name "*.go" -type f); do
  echo "=== FILE: $file ===" >> all_code.txt
  echo "" >> all_code.txt
  cat "$file" >> all_code.txt
  echo "" >> all_code.txt
  echo "=== END OF $file ===" >> all_code.txt
  echo "" >> all_code.txt
done

echo "=== END OF ALL CODE ===" >> all_code.txt