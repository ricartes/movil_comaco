# cordova-sqlite-evplus-ext-free-dependencies (evplus-ext build)

AUTHOR: Christopher J. Brody

LICENSE: GPL v3 (<https://www.gnu.org/licenses/gpl-3.0.txt>) or commercial license options

Contains source and library (shared object) code built from:
- [brodybits / Android-sqlite-evplus-ext-native-driver-free](https://github.com/brodybits/Android-sqlite-evplus-ext-native-driver-free) - GPL v3 or commercial license options
- [SQLite (sqlite.org)](https://sqlite.org/) - public domain
- [brodybits / sqlite3-regexp-cached](https://github.com/brodybits/sqlite3-regexp-cached) (based on <http://git.altlinux.org/people/at/packages/?p=sqlite3-pcre.git> by Alexey Tourbin, public domain)
- [brodybits / sqlite3-base64](https://github.com/brodybits/sqlite3-base64) (Unlicense, public domain)
- [brodybits / libb64-encode](https://github.com/brodybits/libb64-encode) (based on <http://libb64.sourceforge.net/> by Chris Venter, public domain)

This project provides the following dependencies needed to build Cordova SQLite evplus plugin versions:
- `sqlite3.h`, `sqlite3.c` - SQLite `3.30.1` amalgamation needed to build iOS and Windows versions
- [libb64-encode](https://github.com/brodybits/libb64-encode), [sqlite3-base64](https://github.com/brodybits/sqlite3-base64), and [sqlite3-regexp-cached](https://github.com/brodybits/sqlite3-regexp-cached) source for iOS/macOS/Windows platform versions
- `evplus-native-driver.jar` - Android-sqlite-evplus-native-driver-free NDK JAR built with SQLite `3.30.1` amalgamation (using android-ndk version `16b` to support deprecated `armeabi` target), with the following option flags:
   - `-DSQLITE_THREADSAFE=1`
   - `-DSQLITE_DEFAULT_SYNCHRONOUS=3`
   - `-DSQLITE_DEFAULT_MEMSTATUS=0`
   - `-DSQLITE_OMIT_DECLTYPE`
   - `-DSQLITE_OMIT_DEPRECATED`
   - `-DSQLITE_OMIT_PROGRESS_CALLBACK`
   - `-DSQLITE_OMIT_SHARED_CACHE`
   - `-DSQLITE_TEMP_STORE=2`
   - `-DSQLITE_OMIT_LOAD_EXTENSION`
   - `-DSQLITE_ENABLE_FTS3`
   - `-DSQLITE_ENABLE_FTS3_PARENTHESIS`
   - `-DSQLITE_ENABLE_FTS4`
   - `-DSQLITE_ENABLE_FTS5`
   - `-DSQLITE_ENABLE_RTREE`
   - `-DSQLITE_ENABLE_JSON1`
   - `-DSQLITE_DEFAULT_PAGE_SIZE=4096`
   - `-DSQLITE_DEFAULT_CACHE_SIZE=-2000`
