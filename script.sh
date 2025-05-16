

generate_chap_index() {
  local base_dir="./out/chaps"
  local output_file="./src/data.js"

  # Ensure the base directory exists
  if [ ! -d "$base_dir" ]; then
    echo "Error: '$base_dir' does not exist."
    return 1
  fi

  # Start JS strings
  local arr_js="export const arr = ["
  local obj_js="export const obj = {\n"

  local chap_list=()

  # Collect chapter names first
  for chap in "$base_dir"/*; do
    [ -d "$chap" ] || continue
    chap_list+=("$(basename "$chap")")
  done

  # Build arr_js
  for chap_name in "${chap_list[@]}"; do
    arr_js+="\"$chap_name\", "
  done
  arr_js="${arr_js%, }];"  # Trim last comma

  # Build obj_js
  for chap_name in "${chap_list[@]}"; do
    obj_js+="  \"$chap_name\": ["
    local files=("$base_dir/$chap_name"/*.js)
    for file_path in "${files[@]}"; do
      [ -f "$file_path" ] || continue
      file_name=$(basename "$file_path")
      obj_js+="\"$file_name\", "
    done
    obj_js="${obj_js%, }],\n"  # Trim last file comma
  done
  obj_js="${obj_js%,\n}\n};"  # Trim last object comma

  # Write to main.jsx
  {
    echo "$arr_js"
    echo
    echo -e "$obj_js"
  } > "$output_file"

  echo "Generated $output_file with chapter index."
}

npm run clean && npx tsc --pretty && generate_chap_index