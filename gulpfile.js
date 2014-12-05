var gulp = require('gulp');
var ts = require('gulp-typescript');
var rimraf = require('gulp-rimraf');
var runSequence = require('run-sequence');
var chug = require('gulp-chug');
var path = require("path");
var gitUpdate = require("npm-git-update");

var resolve = require("resolve");
var npm = require("npm");
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

    var dirs = nodeModulesPaths(basedir, { paths: [] });
    for (var i = 0; i < dirs.length; i++) {
        var dir = dirs[i];
        var pkgfile = path.join(dir, '/', name, '/package.json');
        if (!isFile(pkgfile)) continue;

        var body = fs.readFileSync(pkgfile, 'utf8');
        var data = JSON.parse(body); 
        return {
            dir: dir,
            path: pkgfile,
            data: data,
        }
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

function build_dep(name) {
    try {
        resolve.sync(name, { basedir: __dirname });
    } catch(err) {
        var gulpfile = path.join("./node_modules", name, "gulpfile.js");
        return gulp.src(gulpfile).pipe(chug());
    }
}

gulp.task("update:browser-relay-client", function(done) {
    gitUpdate(["browser-relay-client"], __dirname, done);
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
        done);
});

gulp.task('clean', function () {
    return gulp.src([
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
        noLib: false, 
        outDir: 'lib',
    });

    var result = gulp
        .src([
            'src/**/*.ts', 
            'typings/**/*.d.ts'
            ])
        .pipe(compiler)
        ;

    result.dts
        .pipe(gulp.dest('lib'))
        ;
    
    return result.js
        .pipe(gulp.dest('lib'))
        ;
});
