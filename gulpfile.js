"use strict"
const gulp = require("gulp")
const fs = require("fs-extra")

const ASSET_FILES = [
  "src/**/*.json",
  "src/**/*.jade",
  "src/**/*.css",
  "src/**/*.png",
  "src/**/*.jpg"
]

gulp.task("build", () => {
  fs.emptyDirSync("./dist")
  fs.removeSync("./dist")
  gulp.src(ASSET_FILES).pipe(gulp.dest("dist"))
})
