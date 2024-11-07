#!/bin/bash

# Generate a random 32-byte hexadecimal string
random_bytes32=$(openssl rand -hex 32)

# Output the result
echo "Random bytes32 in hex: 0x$random_bytes32"
