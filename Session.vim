let SessionLoad = 1
let s:so_save = &g:so | let s:siso_save = &g:siso | setg so=0 siso=0 | setl so=-1 siso=-1
let v:this_session=expand("<sfile>:p")
silent only
silent tabonly
cd ~/git/innei-repo/bump-version
if expand('%') == '' && !&modified && line('$') <= 1 && getline(1) == ''
  let s:wipebuf = bufnr('%')
endif
let s:shortmess_save = &shortmess
if &shortmess =~ 'A'
  set shortmess=aoOA
else
  set shortmess=aoO
endif
badd +198 src/core/run.ts
badd +34 ~/.config/nvim/init.vim
badd +5 ~/.config/nvim/coc-settings.json
argglobal
%argdel
edit src/core/run.ts
let s:save_splitbelow = &splitbelow
let s:save_splitright = &splitright
set splitbelow splitright
wincmd _ | wincmd |
vsplit
1wincmd h
wincmd w
let &splitbelow = s:save_splitbelow
let &splitright = s:save_splitright
wincmd t
let s:save_winminheight = &winminheight
let s:save_winminwidth = &winminwidth
set winminheight=0
set winheight=1
set winminwidth=0
set winwidth=1
exe 'vert 1resize ' . ((&columns * 77 + 77) / 155)
exe 'vert 2resize ' . ((&columns * 77 + 77) / 155)
exe '3resize ' . ((&lines * 3 + 16) / 32)
exe 'vert 3resize ' . ((&columns * 50 + 77) / 155)
argglobal
setlocal fdm=indent
setlocal fde=nvim_treesitter#foldexpr()
setlocal fmr={{{,}}}
setlocal fdi=#
setlocal fdl=99
setlocal fml=1
setlocal fdn=20
setlocal fen
39
normal! zo
54
normal! zo
76
normal! zo
99
normal! zo
105
normal! zo
106
normal! zo
105
normal! zo
106
normal! zo
107
normal! zo
142
normal! zo
155
normal! zo
175
normal! zo
199
normal! zo
200
normal! zo
201
normal! zo
let s:l = 198 - ((15 * winheight(0) + 14) / 28)
if s:l < 1 | let s:l = 1 | endif
keepjumps exe s:l
normal! zt
keepjumps 198
normal! 014|
wincmd w
argglobal
if bufexists(fnamemodify("~/.config/nvim/coc-settings.json", ":p")) | buffer ~/.config/nvim/coc-settings.json | else | edit ~/.config/nvim/coc-settings.json | endif
if &buftype ==# 'terminal'
  silent file ~/.config/nvim/coc-settings.json
endif
balt src/core/run.ts
setlocal fdm=indent
setlocal fde=nvim_treesitter#foldexpr()
setlocal fmr={{{,}}}
setlocal fdi=#
setlocal fdl=99
setlocal fml=1
setlocal fdn=20
setlocal fen
let s:l = 37 - ((19 * winheight(0) + 14) / 28)
if s:l < 1 | let s:l = 1 | endif
keepjumps exe s:l
normal! zt
keepjumps 37
normal! 023|
wincmd w
argglobal
enew
balt src/core/run.ts
setlocal fdm=indent
setlocal fde=nvim_treesitter#foldexpr()
setlocal fmr={{{,}}}
setlocal fdi=#
setlocal fdl=99
setlocal fml=1
setlocal fdn=20
setlocal fen
wincmd w
exe 'vert 1resize ' . ((&columns * 77 + 77) / 155)
exe 'vert 2resize ' . ((&columns * 77 + 77) / 155)
exe '3resize ' . ((&lines * 3 + 16) / 32)
exe 'vert 3resize ' . ((&columns * 50 + 77) / 155)
tabnext 1
if exists('s:wipebuf') && len(win_findbuf(s:wipebuf)) == 0 && getbufvar(s:wipebuf, '&buftype') isnot# 'terminal'
  silent exe 'bwipe ' . s:wipebuf
endif
unlet! s:wipebuf
set winheight=1 winwidth=20
let &shortmess = s:shortmess_save
let &winminheight = s:save_winminheight
let &winminwidth = s:save_winminwidth
let s:sx = expand("<sfile>:p:r")."x.vim"
if filereadable(s:sx)
  exe "source " . fnameescape(s:sx)
endif
let &g:so = s:so_save | let &g:siso = s:siso_save
nohlsearch
doautoall SessionLoadPost
unlet SessionLoad
" vim: set ft=vim :
