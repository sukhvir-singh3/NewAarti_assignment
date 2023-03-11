/*********************************************************************************
* WEB322 – Assignment 04
* I declare that this assignment is my own work in accordance with Seneca Academic Policy. No part
* of this assignment has been copied manually or electronically from any other source
* (including 3rd party web sites) or distributed to other students.
*
* Name: Aarti 
* Student ID:154931216 
* Date: 9 Mar 
*
* Online (Cyclic) Link: 
*
********************************************************************************/

var express = require('express');
var app = express();
var path = require('path');
var dataService = require('./data-service.js');
const fs = require('fs');
const multer = require("multer");
const upload = multer();
const cloudinary = require("cloudinary").v2;
cloudinary.config({

	cloud_name: 'dsfcyxyoi',
	api_key: '441275942425923',
	api_secret: 'QaSHf8HsBu8ylki7bUjSNVlPFSM',
	secure: true

});

const streamifier = require("streamifier");
var HTTP_PORT = process.env.PORT || 8080;

app.use(function (req, res, next) {
	let route = req.baseUrl + req.path;
	app.locals.activeRoute = (route == "/") ? "/" : route.replace(/\/$/, "");
	next();
});

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

var onHttpStart = function () {
	console.log("Express http server listening on", HTTP_PORT);
}

const exphbs = require('express-handlebars');

app.engine('hbs', exphbs.engine({
	extname: '.hbs',
	defaultLayout: 'main',
	helpers: {
		navLink: function (url, options) {
			return '<li' +
				((url == app.locals.activeRoute) ? ' class="active" ' : '') +
				'><a href="' + url + '">' + options.fn(this) + '</a></li>';
		},

		equal: function (lvalue, rvalue, options) {
			if (arguments.length < 3)
				throw new Error("Handlebars Helper equal needs 2 parameters");
			if (lvalue != rvalue) {
				return options.inverse(this);
			} else {
				return options.fn(this);
			}
		}
	}

}));

app.set('view engine', 'hbs');
app.get("/", (req, res) => {
	res.render(path.join(__dirname, "/views/home.hbs"));
});

app.get('/about', (req, res) => {
	res.render(path.join(__dirname, '/views/about.hbs'))
});

app.get('/students/add', (req, res) => {
	res.render(path.join(__dirname, '/views/addStudent.hbs'))
});

app.get('/images/add', (req, res) => {
	res.render(path.join(__dirname, '/views/addImage.hbs'))
});

app.post('/images/add', upload.single('imageFile'), (req, res) => {
	if (req.file) {
		let streamUpload = (req) => {
			return new Promise((resolve, reject) => {
				let stream = cloudinary.uploader.upload_stream(
					(error, result) => {
						if (result) {
							resolve(result);
						} else {
							reject(error);
						}
					}
				);
				streamifier.createReadStream(req.file.buffer).pipe(stream);
			});
		};

		async function upload(req) {
			let result = await streamUpload(req);
			console.log(result);
			return result;
		}

		upload(req).then((uploaded) => {
			processForm(uploaded.url);
		});
	} else {
		processForm("");
	}

	function processForm(imageUrl) {
		dataService.addImage(imageUrl)
			.then(() => {
				res.redirect("/images");
			})
			.catch((err) => {
				console.log(err);
				res.redirect("/images");
			});
	}
});

app.get('/images', (req, res) => {
	dataService.getImages()
		.then((images) => {
			var obj = { images: images };
			res.render("images", obj);
		})
		.catch((err) => {
			res.status(500).json({ error: err });
		});
});

app.post('/students/add', (req, res) => {
	dataService.addStudent(req.body)
		.then(() => {
			res.redirect('/students');
		})
		.catch((error) => {
			console.error(error);
			res.sendStatus(500);
		});
});

app.get('/student/:id', (req, res) => {
	const studentId = req.params.id;

	dataService.getStudentById(studentId)
		.then((student) => {
			if (student) {
				res.render('student', { student });
			} else {
				res.status(404).json({ message: 'Student not found' });
			}
		})
		.catch((err) => {
			res.render("students", { message: "no results" });
		});
});

app.post("/student/update", (req, res) => {
	dataService.updateStudent(req.body)
		.then(() => {
			res.redirect("/students");
		})
		.catch((err) => {
			console.error(err);
			res.sendStatus(500);
		});
});

app.get('/students', (req, res) => {
	if (Object.keys(req.query).length === 0) {
		dataService.getAllStudents()
			.then((studentsArr) => {
				res.render('students', { students: studentsArr });
			})
			.catch((err) => {
				res.json({ message: err });
			});
	}
	else {
		let status = req.query.status;
		let program = req.query.program;
		let credential = req.query.credential;

		if (status) {
			dataService.getStudentsByStatus(status)
				.then((studentsArr) => {
					res.render('students', { students: studentsArr });
				})
				.catch((err) => {
					res.render("students", { message: "no results" });
				});
		}
		else if (program) {
			dataService.getStudentsByProgramCode(program)
				.then((studentsArr) => {
					res.render('students', { students: studentsArr });
				})
				.catch((err) => {
					res.render("students", { message: "no results" });
				});
		}
		else if (credential) {
			dataService.getStudentsByExpectedCredential(credential)
				.then((studentsArr) => {
					res.render('students', { students: studentsArr });
				})
				.catch((err) => {
					res.render("students", { message: "no results" });
				});
		}
	}
});

app.get('/intlstudents', (req, res) => {
	dataService.getInternationalStudents().then((studentsArr) => {
		var student = studentsArr.map(function (elem, index) {
			if (elem.isInternationalStudent == true) {
				return elem;
			}
		});
		res.send(student);
	}).catch((err) => { res.json({ message: err }); });
});

app.get('/programs', (req, res) => {
	dataService.getPrograms().then((ProgramArr) => {
		res.render("programs", { programs: ProgramArr });
	}).catch((err) => { res.json({ message: err }); });
});

app.use((req, res) => {
	res.status(404).send('Page Not Found');
})
dataService.initialize()
	.then(() => {
		app.listen(HTTP_PORT, () => {
			console.log(`Server running on port: ${HTTP_PORT}`);
		});
	})
	.catch((err) => {
		console.log(err);
	});