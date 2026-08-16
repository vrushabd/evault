import re

css = """
  :root {
    --paper-bg: #fcfbf8;
    --paper-surface: #f4f2eb;
    --paper-card: #ffffff;
    --paper-border: #dcd8cc;
    --paper-border-dark: #18181b;
    --paper-ink: #18181b;
    --paper-muted: #64656b;
    --paper-light-muted: #94959c;
    --paper-rust: #c2410c;
    --paper-rust-hover: #9a3412;
    --paper-emerald: #15803d;
  }

  .dark {
    --paper-bg: #09090b;
    --paper-surface: #18181b;
    --paper-card: #27272a;
    --paper-border: #3f3f46;
    --paper-border-dark: #fafafa;
    --paper-ink: #fafafa;
    --paper-muted: #a1a1aa;
    --paper-light-muted: #71717a;
    --paper-rust: #ea580c;
    --paper-rust-hover: #c2410c;
    --paper-emerald: #22c55e;
  }
"""

def hex_to_rgb(match):
    h = match.group(1)
    return f"{int(h[0:2], 16)} {int(h[2:4], 16)} {int(h[4:6], 16)}"

res = re.sub(r'#([0-9a-fA-F]{6})', hex_to_rgb, css)
print(res)
