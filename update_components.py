import re

# Update input.tsx
with open('components/ui/input.tsx', 'r') as f:
    input_content = f.read()

input_content = re.sub(
    r'className={cn\([\s\S]*?className\n\s*\)}',
    '''className={cn(
          "flex w-full rounded-[32px] border border-slate-200/60 bg-white/80 backdrop-blur-2xl px-6 py-4",
          "text-base text-slate-800 placeholder:text-slate-400 leading-relaxed",
          "shadow-sm",
          "ring-offset-transparent transition-all duration-200 ease-in-out",
          "focus:outline-none focus:border-indigo-300 focus:bg-white focus:shadow-md focus:ring-4 focus:ring-indigo-500/10",
          "resize-none overflow-hidden min-h-[64px] max-h-[240px]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}''',
    input_content
)

with open('components/ui/input.tsx', 'w') as f:
    f.write(input_content)


# Update page.tsx
with open('app/page.tsx', 'r') as f:
    page_content = f.read()

# Replace bg colors
page_content = page_content.replace('bg-[#080c18]', 'bg-[#fafbfc]')

# Replace background gradient layers
old_bg = """{/* Background gradient layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/80 via-indigo-950/60 to-slate-950/90 pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-indigo-600/8 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-blue-600/6 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-violet-700/4 blur-3xl pointer-events-none" />"""

new_bg = """{/* Background gradient layers - Light Mesh */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-white to-sky-50/50 pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-purple-200/40 blur-3xl mix-blend-multiply pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-blue-200/40 blur-3xl mix-blend-multiply pointer-events-none animate-pulse" style={{ animationDuration: '10s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-pink-200/30 blur-3xl mix-blend-multiply pointer-events-none animate-pulse" style={{ animationDuration: '12s' }} />"""

page_content = page_content.replace(old_bg, new_bg)

# Replace header text colors
page_content = page_content.replace('text-white font-semibold', 'text-slate-800 font-semibold')
page_content = page_content.replace('text-white/35', 'text-slate-500')
page_content = page_content.replace('border-white/5', 'border-slate-200/50')

# Replace user message bubble
page_content = page_content.replace('bg-indigo-500/20 border border-indigo-400/20', 'bg-indigo-50 border border-indigo-100')
page_content = page_content.replace('text-white/90 text-sm', 'text-slate-800 text-sm')

# Replace Welcome texts
page_content = page_content.replace('text-white/90 font-medium', 'text-slate-700 font-medium')
page_content = page_content.replace('text-white font-semibold', 'text-slate-800 font-semibold')

# Replace Input style override
page_content = page_content.replace('bg-[#252528] hover:bg-[#2A2A2D] border-none', 'bg-white/90 hover:bg-white shadow-sm border border-slate-200/60')

# Replace Hints
page_content = page_content.replace('text-white/20 text-xs', 'text-slate-400 text-xs')

with open('app/page.tsx', 'w') as f:
    f.write(page_content)
