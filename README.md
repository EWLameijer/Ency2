# Ency2
Encyclopedizer software (new version, using Electron instead of JavaFX)

If you ever make notes, especially if you are making many notes on something (like when learning a programming language, or studying a scientific field), you may have noticed that putting those notes in a large Word document is not necessarily ideal. You can add an entry, but retrieving the information you need can be rather laborious, especially since synonyms and superficial mentions ('uniform cost search' -> 'can be used by uniform cost search') either result in you not retrieving what you are looking for, or finding too many mentions, and having to click through a row of "find next"s.

Of course, the time-honored way to solve this is to have an encyclopedia, where you can find what you need by searching alphabetically. This can be quite efficient, but browsing on a computer and updating the knowledge (was r before or after s, again?) can be cumbersome and error-prone.

Ency2 aims to make this process easier: if you enter the first letters of a search term, it will go to that term, or create one if none exists yet. The up and down arrow keys (when used in the seach term box) go to the previous and next term, the escape button clears the term box and allows you to enter a new term, the 'Load', 'Save' and 'Delete Entry' buttons do what you'd expect them to do. 

Ency2 reads (and creates) text files with a ':' separated format, like 

>string.slice: string.slice(beginning\[, end]) returns a part of the string. It is like substring, but can use negative indices to give the last character, "abcd".slice(-2) returns "cd"
>
>throw: in JavaScript, you homebrew your exceptions. Should contain name and message properties Example: throw { name: 'divideByZero', message: 'divisor was zero' }
"""

This way you can easily compress them, back them up (backups of the original file are made automatically on load), or use them for other purposes (as the 'Pragmatic Programmers' claimed: no format is as enduring and universal as ".txt")

As of this writing (Aug 13, 2020), the project is still in progress (still some things on my to-do-list, like removing the electron default menu, allowing renaming of terms and allowing one to easily switch between different encyclopedias), but it is already functional enough for my own working projects, so if you like to try it out, please feel free to do so! Suggestions on improved functionality or tips on graphical restyling are also welcome...

Thank you for reading this!

Eric-Wubbo
