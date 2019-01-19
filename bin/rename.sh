#!/bin/bash

for file in $(find -maxdepth 2 -type d | grep '.*\/.*\/.*')
do
  name=$(echo "$file" | sed -rn 's/^\.\/(.*)\/.*_(.*)$/\1\/\2/p')
  echo "$file $name"
  mv $file $name
done
