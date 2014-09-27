var gulp = require('gulp');
var ts = require('gulp-typescript');
var rimraf = require('gulp-rimraf');
var browserify = require('gulp-browserify');
var runSequence = require('run-sequence');
var chug = require('gulp-chug');
var path = require("path");

var resolve = require("resolve");
var npm = require("npm");
var gh = require('github-url-to-object');
var semver = require('semver-extra');
var nodeModulesPaths = require("resolve/lib/node-modules-paths")
var fs = require("fs");

var exec = require('child_process').exec;

function getPackage(name, basedir) {
    var isFile = function (file) {
        try { var stat = fs.statSync(file) }
        catch (err) { if (err && err.code === 'ENOENT') return false }
        return stat.isFile() || stat.isFIFO();
    };

    opts = {};
    opts.paths = opts.paths || [];

    function loadAsDirectorySync(x) {
        var pkgfile = path.join(x, '/package.json');
        if (isFile(pkgfile)) {
            var body = fs.readFileSync(pkgfile, 'utf8');
            try {
                return {
                    dir: x,
                    path: pkgfile,
                    data: JSON.parse(body),
                }
            }
            catch (err) {}
        }
    }

    var dirs = nodeModulesPaths(basedir, opts);
    for (var i = 0; i < dirs.length; i++) {
        var dir = dirs[i];
        var n = loadAsDirectorySync(path.join( dir, '/', name ));
        if (n) return n;
    }
}


function installDevDependencies(name, cb) {
    npm.load({ loaded: false }, function (err) {
        npm.on("log", function (message) {
            console.log(message);
        });
        var pkg = getPackage(name, __dirname);
        var deps = pkg.data.devDependencies;
        var install = [];
        for(var depname in deps) {
            var depver = deps[depname];
            var deppkg = getPackage(depname, pkg.dir);
            if(deppkg) {
                var satisfies = semver.satisfies(deppkg.data.version, depver);
                if (!satisfies) {
                    install.push(depname + "@" + depver);
                }
            } else {
                install.push(depname + "@" + depver);
            }
        }
        if(install.length > 0) {
            console.log(install.join(", ") + " need to be installed for `" + name + "`")
            npm.commands.install(install, cb);
        } else {
            cb();
        }
    });
}

function getGitTags(repo, cb) {
    var cmd = ["git", "ls-remote", "--tags", repo];
    var matcher = /[0-9a-fA-F]{40}\s+refs\/tags\/(v?(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*))/g;
    var tags = [];
    exec(cmd.join(" "), function (error, stdout, stderr) {
        var match;
        if (error !== null) {
            cb(error);
        } else {
            while (match = matcher.exec(stdout)) {
                var tag = match[1];
                if(tags.indexOf(tag) == -1) {
                    tags.push(tag);
                }
            }
            cb(null, tags);
        }
    });
}

function updateGitDependency(name, cb) {
    var pkg = getPackage(name, __dirname).data;
    var gho = gh(pkg.repository.url);
    var url = "https://github.com/" + gho.user + "/" + gho.repo;
    getGitTags(url, function(err, tags) {
        if(err) {
            cb(err);
        } else {
            var max = semver.max(tags);
            if(semver.eq(pkg.version, max)) {
                cb(null, null);
            } else {
                console.log("Updating `" + name +"` to " + max);
                npm.load({ loaded: false }, function (err) {
                    npm.on("log", function (message) {
                        console.log(message);
                    });
                    npm.commands.install([gho.user + "/" + gho.repo + "#" + max], cb);
                });
            }
        }
    });
}

function build_dep(name) {
    try {
        resolve.sync(name, { basedir: __diname });
    } catch(err) {
        var gulpfile = path.join("./node_modules", name, "gulpfile.js");
        return gulp.src(gulpfile).pipe(chug());
    }
}

gulp.task("update:browser-relay-client", function(done) {
    updateGitDependency("browser-relay-client", done);
});

gulp.task("install:browser-relay-client", function(done) {
    installDevDependencies("browser-relay-client", done);
});

gulp.task("build:browser-relay-client", function () {
    return build_dep("browser-relay-client");
});

gulp.task('default', function(done) {
    runSequence(
        "clean", 
        "update:browser-relay-client",
        "install:browser-relay-client",
        "build:browser-relay-client",
        "compile", 
        "bundle", 
        "finalize",
        done);
});

gulp.task('clean', function () {
    return gulp.src([
        'dist/**/*.js',
        'dist/**/*.map',
        'lib/**/*.js',
        'lib/**/*.d.ts',
        ], { read: false })
    .pipe(rimraf({ force: true }));
});

gulp.task('compile', function () {
    var compiler = ts({
        declarationFiles: true,
        noExternalResolve: false,
        module: 'commonjs',
        target: 'ES5',
        noImplicitAny: true, 
        noLib: true, 
        outDir: 'lib',
    });

    var result = gulp
        .src([
            'src/**/*.ts', 
            'typings/**/*.d.ts'
            ])
        .pipe(compiler)
        ;
    
    return result.js
        .pipe(gulp.dest('temp'))
        ;
});

gulp.task('bundle', function () {
    return gulp.src("temp/index.js")
        .pipe(browserify({
            insertGlobals: true,
            debug: true,
        }))
        .pipe(gulp.dest('dist'))
        ;
});

gulp.task('finalize', function() {
    return gulp.src("temp")
        .pipe(rimraf({ force: true }));
});

// gulp.task('spa', ['compile'], function () {
//     spa.from_config("spa.yaml").build();
// });