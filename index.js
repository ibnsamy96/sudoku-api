var express = require("express");
const cors = require("cors");
var fetch = require("node-fetch");
const fs = require("fs");
var csv = require("async-csv");

var app = express();
app.use(cors());

const fsPromises = fs.promises;

const encodeBoard = (board) =>
	board.reduce(
		(result, row, i) =>
			result +
			`%5B${encodeURIComponent(row)}%5D${i === board.length - 1 ? "" : "%2C"}`,
		""
	);

const encodeParams = (params) =>
	Object.keys(params)
		.map((key) => key + "=" + `%5B${encodeBoard(params[key])}%5D`)
		.join("&");

const flattenBoard = (board) => {
	return board
		.reduce((acc, row) => {
			row.forEach((num) => acc.push(num));
			return acc;
		}, [])
		.join("")
		.replace(/0/g, ".");
};

async function get9by9() {
	const response = await fetch(
		"https://sugoku.herokuapp.com/board?difficulty=easy"
	);
	const board = await response.json();

	const responseSol = await fetch("https://sugoku.herokuapp.com/solve", {
		method: "POST",
		body: encodeParams(board),
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
	});

	const sol = await responseSol.json();
	return {
		board: flattenBoard(board["board"]),
		solution: flattenBoard(sol["solution"]),
	};
}

async function get4by4() {
	const csvString = await fsPromises.readFile("data.csv", "utf-8");
	const fileRows = await csv.parse(csvString);

	const boardsObjects = fileRows.slice(1).reduce((acc, row) => {
		return [...acc, { board: row[0], solution: row[1] }];
	}, []);
	const randomIndex = Math.round(Math.random() * 100);
	return {
		board: boardsObjects[randomIndex].board.replace(/0/g, "."),
		solution: boardsObjects[randomIndex].solution.replace(/0/g, "."),
	};
}

app.get("/", async (req, res, next) => {
	const neededType = parseInt(req.query.type);

	let puzzle;
	if (neededType === 4) puzzle = await get4by4();
	else if (neededType === 9) puzzle = await get9by9();
	else if (isNaN(neededType))
		res.status(400).json({
			"error-message":
				"Query params must have 'type' attribute and it must have a value.",
		});
	else
		res.status(400).json({
			"error-message":
				"Query param value must be either 4 or 9, the entered value is " +
				neededType +
				" !",
		});

	res.json(puzzle);
});

app.listen(3000, () => {
	console.log("Server running on port 3000");
});

module.exports = app;
