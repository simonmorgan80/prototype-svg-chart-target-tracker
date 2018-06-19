'use strict';
 
const gulp = require('gulp');
const sass = require('gulp-sass');
const webpackStream = require('webpack-stream');
const webpack = require('webpack');
const webpackConfig = require('./webpack.config');
 
gulp.task('sass', function () {
    return gulp.src('./src/scss/**/*.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(gulp.dest('./dist/css'));
});

gulp.task('sass:watch', function () {
    gulp.watch('./src/scss/**/*.scss', ['sass']);
});

gulp.task('webpack', function() {
    webpack(webpackConfig, function (err, stats){
        if (err) {
            console.log(err);
        }
    });
});

gulp.task('default', ['webpack', 'sass:watch']);