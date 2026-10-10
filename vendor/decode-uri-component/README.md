# Decoder compatibility adapter

This adapter retains the CommonJS function contract used by React Navigation 6,
while delegating decoding entirely to upstream patched `decode-uri-component`
0.5.0. No decoding algorithm is copied or reimplemented.

The npm alias preserves the upstream module and its own license. Node 22+ and
Expo Metro must both be tested. This adapter is not security approval.

Advisory: https://github.com/advisories/GHSA-vcc3-ghjq-m6fr
