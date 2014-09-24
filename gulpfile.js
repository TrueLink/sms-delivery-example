var gulp = require('gulp');
var ts = require('gulp-type');
var rimraf = require('gulp-rimraf');
var browserify = require('gulp-browserify');
var runSequence = require('run-sequence');
var chug = require('gulp-chug');
var path = require("path");
var exec = require("child_process").exec;

gulp.task('default', function(done) {
    runSequence(
        "clean", 
        [
            "install:browser-relay-client",
        ],
        [
            "build:browser-relay-client",
        ],
        "compile", 
        "bundle", 
        "finalize",
        done);
});

function install_dep(name, done) {
    var package_dir = path.join("./node_modules", name)
    exec("npm install", {
        cwd: package_dir,
    }, function (error, stdout, stderr) {
        var text = '[npm] ';
        if(stdout) {
            console.log(text + stdout.replace(/^/, text));
        }
        if(stderr) {
            console.log(text + stderr.replace(/^/, text));
        }
        console.log(error);
        done(error);
    });    
}

function build_dep(name) {
    var gulpfile = path.join("./node_modules", name, "gulpfile.js");
    return gulpfile.src(filepath).pipe(chug())
}

gulp.task("install:browser-relay-client", function (done) {
    install_dep("browser-relay-client", done);
});

gulp.task("build:browser-relay-client", function () {
    return build_dep("browser-relay-client");
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