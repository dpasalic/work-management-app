/** @type {import('tailwindcss').Config} */
const colors = require('tailwindcss/colors');

module.exports = {
    content: ["./view/**/*.ejs"],
    theme: {
        extend: {
            colors: {
                ...colors
            }
        }
    },
    plugins: [],
}