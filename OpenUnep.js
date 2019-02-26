/*global require*/
/*
 * Bootstrap-based responsive mashup
 * @owner Erik Wetterberg (ewg)
 */
/*
 *    Fill in host and port for Qlik engine
 */
var prefix = window.location.pathname.substr( 0, window.location.pathname.toLowerCase().lastIndexOf( "/extensions" ) + 1 );
var config = {
	host: window.location.hostname,
	prefix: prefix,
	port: window.location.port,
	isSecure: window.location.protocol === "https:"
};
//to avoid errors in workbench: you can remove this when you have added an app
var app;
require.config( {
	baseUrl: (config.isSecure ? "https://" : "http://" ) + config.host + (config.port ? ":" + config.port : "" ) + config.prefix + "resources"
} );

require( ["js/qlik"], function ( qlik ) {

	$("#closeerr").on('click',function(){
		$("#errmsg").html("").parent().hide();
	});
	qlik.setOnError( function ( error ) {
		$("#errmsg").append("<div>"+error.message+"</div>").parent().show();
	} );

	//
	function AppUi ( app ) {
		var me = this;
		this.app = app;
		app.global.isPersonalMode( function ( reply ) {
			me.isPersonalMode = reply.qReturn;
		} );
		app.getAppLayout( function ( layout ) {
			$( "#title" ).html( layout.qTitle );
			$( "#title" ).attr("title", "Last reload:" + layout.qLastReloadTime.replace( /T/, ' ' ).replace( /Z/, ' ' ) );
			//TODO: bootstrap tooltip ??
		} );
		app.getList( 'SelectionObject', function ( reply ) {
			$( "[data-qcmd='back']" ).parent().toggleClass( 'disabled', reply.qSelectionObject.qBackCount < 1 );
			$( "[data-qcmd='forward']" ).parent().toggleClass( 'disabled', reply.qSelectionObject.qForwardCount < 1 );
		} );
		app.getList( "BookmarkList", function ( reply ) {
			var str = "";
			reply.qBookmarkList.qItems.forEach( function ( value ) {
				if ( value.qData.title ) {
					str += '<li><a href="#" data-id="' + value.qInfo.qId + '">' + value.qData.title + '</a></li>';
				}
			} );
			str += '<li><a href="#" data-cmd="create">Create</a></li>';
			$( '#qbmlist' ).html( str ).find( 'a' ).on( 'click', function () {
				var id = $( this ).data( 'id' );
				if ( id ) {
					app.bookmark.apply( id );
				} else {
					var cmd = $( this ).data( 'cmd' );
					if ( cmd === "create" ) {
						$('#createBmModal' ).modal();
					}
				}
			} );
		} );
		$( "[data-qcmd]" ).on( 'click', function () {
			var $element = $( this );
			switch ( $element.data( 'qcmd' ) ) {
				//app level commands
				case 'clearAll':
					app.clearAll();
					removeprojectdetails();
					hidebreakdowntable();
                    enlargeworldmap();
                    enlargescattermap();
					break;
				case 'back':
					app.back();
					break;
				case 'forward':
					app.forward();
					break;
				case 'lockAll':
					app.lockAll();
					break;
				case 'unlockAll':
					app.unlockAll();
					break;
				case 'createBm':
					var title = $("#bmtitle" ).val(), desc = $("#bmdesc" ).val();
					app.bookmark.create( title, desc );
					$('#createBmModal' ).modal('hide');
					break;
				case 'reload':
					if ( me.isPersonalMode ) {
						app.doReload().then( function () {
							app.doSave();
						} );
					} else {
						qlik.callRepository( '/qrs/app/' + app.id + '/reload', 'POST' ).success( function ( reply ) {
							//TODO:handle errors, remove alert
							alert( "App reloaded" );
						} );
					}
					break;
			}
		} );

		$('body').on( "click", "[data-select]", function() {
			var field = $(this).data('select');
			var fieldName = $(this).data('fieldname');
			var value = $(this).data('value');
			console.log(value);
			app.field(fieldName).selectValues([value], true, false);
			$('#dropdown'+field + ' button').html(value + ' <span class="caret"></span>');
			$('#dropdown'+field + ' ul li').removeClass('active');
			$('#dropdown'+field + ' ul li:contains(\''+value+'\')').addClass('active');
		});
	}  

    //menu div animation
    $(window).scroll(function(){
    	$('#selection menu').stop().animate({"marginTop": ($(window).scrollTop()) + "px","marginLeft":($(window).scrollLeft()) + "px"}, "slow");
        
    });
//menu onclick event
$('#clearall').click(function(){
	                    app.clearAll();	 
                	 });

$('#back').click(function(){
	                     app.back();
	                     console.log("working");
                	 });
 

	//open apps -- inserted here --
	var app = qlik.openApp('New Project analysis.qvf', config);

	//get objects -- inserted here --
	app.getObject('QV03','eBmJE');
	app.getObject('QV02','WaMzz');
	//app.getObject('QV01','HdPj');
	
	
	app.getObject('CurrentSelections','CurrentSelections');
	
	
  //create a empty country selected variable
  countryselected = "none";
	var data = {
		hq: {},
		rf: {}
	};

	getFieldData('country_name', function () {
		createFieldFilter('country_name', 'country_name');
	}, 'country_name');

	getFieldData('year', function () {
		createFieldFilter('year');
	});

	getFieldData('ProjStatus', function () {
		createFieldFilter('ProjStatus');
	})

	function getFieldData (field, callback, title) {
		app.createList({
			qDef: {
				qGrouping: "H",
				qFieldDefs: [
					field
				],
				qSortCriterias: [{
					qSortByAscii: 1,
					qSortByLoadOrder: 1
				}],
			},
			qInitialDataFetch: [{
				qTop : 0,
				qLeft : 0,
				qHeight : 1000,
				qWidth : 1
			}],
			qShowAlternatives: false,
		}, function(reply) {
			field = (title) ? title : field;
			data.hq[field] = reply.qListObject.qDataPages[0].qMatrix;
			refactorFieldData(field);
			callback(true);
		});
	};

	// Refactor Data to a more readable format rather than qText etc.
	function refactorFieldData (field) {
		var tdata = [];
		$.each(data.hq[field], function(key, value) {
			if (value[0].qState!=='X') {
				tdata.push(value[0].qText);
			}
		});
		data.rf[field] = tdata;
	};

	function createFieldFilter (field, fieldName) {
		fieldName = (fieldName) ? fieldName : field;
		if (data.rf[field].length > 1) {
			var $element = $('#dropdown'+field + ' ul');
			$element.empty();
			var all = "";
			
			$.each(data.rf[field], function(key, value) {
				$element.append('<li><a data-select="'+ field + '" data-fieldname="'+ fieldName + '" data-value="'+ value + '">'+value+'</a></li>');
			});
		}
	}; 
   
   //hyper cube with countries
 
function makecube() {

 app.createCube({
        qDimensions: [
        { qDef: { qFieldDefs: ["[ProjTitle]"]}},
        { qDef: { qFieldDefs: ["[ProjSummary]"]}},
        { qDef: { qFieldDefs: ["[ManagingDivision]"]}},
        { qDef: { qFieldDefs: ["[AnticipatedResults]"]}},
        { qDef: { qFieldDefs: ["[ProjStatus]"]}},
        { qDef: { qFieldDefs: ["[StartDate]"]}},
        { qDef: { qFieldDefs: ["[ActualStartDate]"]}},
        { qDef: { qFieldDefs: ["[EndDate]"]}},
        { qDef: { qFieldDefs: ["[ApprovedBudget]"]}},
        { qDef: { qFieldDefs: ["[Challenges]"]}},
        { qDef: { qFieldDefs: ["[DelayReasons]"]}},
        { qDef: { qFieldDefs: ["[MainActivities]"]}},
        { qDef: { qFieldDefs: ["[KeyIssues]"]}},
        { qDef: { qFieldDefs:["[CompletionDate]"]}},
        { qDef: { qFieldDefs:["[DelayReasons]"]}},            
        { qDef: { qFieldDefs:["[Objective]"]}},
        {qDef: { qFieldDefs:["[ProgrammedBudget]"]}},
        ],
        qMeasures: [{
            qDef: {
                qDef: "[count(distinct[ProjectID-project_id])]",
                qLabel: ""
            }
        }],
        qInitialDataFetch: [{
            qHeight: 20,
            qWidth: 20
        }],

         params: [{
         	qSelectionObjectDef: {}
         }]
    }, function(reply) {
       
       //console.log(reply.qHyperCube.qDataPages[0].qMatrix);
        $.each(reply.qHyperCube.qDataPages[0].qMatrix, function(index, value) {
           var ProjTitle = reply.qHyperCube.qDataPages[0].qMatrix[0][0].qText;
           var ProjSummary= reply.qHyperCube.qDataPages[0].qMatrix[0][1].qText;
           var ManagingDivision = reply.qHyperCube.qDataPages[0].qMatrix[0][2].qText;
           var AnticipatedResults = reply.qHyperCube.qDataPages[0].qMatrix[0][3].qText;
           var ProjStatus = reply.qHyperCube.qDataPages[0].qMatrix[0][4].qText;
           var StartDate = reply.qHyperCube.qDataPages[0].qMatrix[0][5].qText;
           var ActualStartDate = reply.qHyperCube.qDataPages[0].qMatrix[0][6].qText;
           var EndDate = reply.qHyperCube.qDataPages[0].qMatrix[0][7].qText;
           var ApprovedBudget = reply.qHyperCube.qDataPages[0].qMatrix[0][8].qText;
           var Challenges = reply.qHyperCube.qDataPages[0].qMatrix[0][9].qText;
           var DelayReasons = reply.qHyperCube.qDataPages[0].qMatrix[0][10].qText;
           var MainActivities = reply.qHyperCube.qDataPages[0].qMatrix[0][11].qText;
           var KeyIssues = reply.qHyperCube.qDataPages[0].qMatrix[0][12].qText;
           var CompletionDate = reply.qHyperCube.qDataPages[0].qMatrix[0][13].qText;
           var DelayReasons = reply.qHyperCube.qDataPages[0].qMatrix[0][14].qText;
           var Objectives = reply.qHyperCube.qDataPages[0].qMatrix[0][15].qText;
           var ProgrammedBudget = reply.qHyperCube.qDataPages[0].qMatrix[0][16].qText;
           var Fundingshortfall = ApprovedBudget - ProgrammedBudget;

           
           //var AnticipatedResults = reply.qHyperCube.qDataPages[0].qMatrix[0][2].qText;
           //var ManagingDivision = reply.qHyperCube.qDataPages[0].qMatrix[0][2].qText;

           $('#projectoverview').empty();
           $('#projectoverview').append("<H2>" + ProjTitle + "</H2>" +  
           	"<H3> Project Summary </H3>" + ProjSummary + "</BR>" +
           	"<BR> <H4> Managing Division </H4>" + ManagingDivision + 
           	"<BR> <H4> Project Objectives </H4>" + Objectives + 
           	"<BR> <H4> Anticipated Results </H4>" + AnticipatedResults + 
           	"<BR> <H4> Main Activities </H4>" + MainActivities + 
           	"<BR> <H4> Project Status </H4>" + ProjStatus +
            "<BR> <H4> Approved Budget </H4>" +"$" + ApprovedBudget +
            "<BR> <H4> Funding Shortfall </H4>" +"$" + Fundingshortfall +
           	"<BR> <H4> Project Timeline </H4>" + 
           	"<BR> Planned Start Date: " + StartDate + "&nbsp Actual Start Date: " + ActualStartDate + "&nbsp Planned End Date: " + EndDate + "&nbsp Actual Completion Date: " + CompletionDate +
           	"<BR> <H4> Challenges: </H4>" + Challenges +
           	"<BR> <H4> Key Issues: </H4>" + KeyIssues +
           	"<BR> <H4> Delay Reasons: </H4>" + DelayReasons 

           	//"<H4> Anticipated Results </H4>" + AnticipatedResults + "<BR>" + 
           	);
            
            //var valueArray = [];
            //if (!this[0].qIsEmpty) {
                //valueArray.push(this[1].qNum);

                //console.log(valueArray);
            //}
            //create the pie chart
        });
    });
 

setTimeout(function (){
project_staff();
project_fmo();
},1000);

}

function project_staff() {

 app.createCube({
        qDimensions: [
  
        { qDef: { qFieldDefs: ["[staff]"]}},

        ],
        qMeasures: [{
            qDef: {
                qDef: "",
                qLabel: ""
            }
        }],
        qInitialDataFetch: [{
            qHeight: 20,
            qWidth: 20
        }] 
    }, function(reply) {
       
       //console.log(reply.qHyperCube.qDataPages[0].qMatrix);
       $('#projectoverview').append( "<BR> <H4> Project Staff: </H4>"); 
       var i =0;
        $.each(reply.qHyperCube.qDataPages[0].qMatrix, function(index, value) {
           var project_staff = reply.qHyperCube.qDataPages[0].qMatrix[i][0].qText;
           //console.log(project_staff);
          
           $('#projectoverview').append(  
           	project_staff + "<BR>" 
           	);
            i = i + 1;
        });
    });
 

};

function project_fmo() {

 app.createCube({
        qDimensions: [
  
        { qDef: { qFieldDefs: ["[fmo]"]}},

        ],
        qMeasures: [{
            qDef: {
                qDef: "",
                qLabel: ""
            }
        }],
        qInitialDataFetch: [{
            qHeight: 20,
            qWidth: 20
        }] 
    }, function(reply) {
       
       //console.log(reply.qHyperCube.qDataPages[0].qMatrix);
       $('#projectoverview').append( "<BR> <H4> Project Fund Managment Officer: </H4>"); 
       var i =0;
        $.each(reply.qHyperCube.qDataPages[0].qMatrix, function(index, value) {
           var project_fmo = reply.qHyperCube.qDataPages[0].qMatrix[i][0].qText;
          
          
           $('#projectoverview').append(  
           	project_fmo + "<BR>"       	
           	);
            i = i + 1;
        });
    });
 

}


//get selection state of the apps
$('#QV04').hide();


var selState = app.selectionState();

//animation functions
function hidebreakdowntable(){
	  $('#QV04').hide();
	 
};


function showbreakdowntable(){
  $('#QV04').show();

  app.getObject('QV04','JSDQ');
                
                //$('#QV04').animate ({
                	


                		//top: '500px',
                		//left: '200px',
                		//width: '700px',
                		//height:'700px'
                	//}, 2000);
                  //qlik.resize('JSDQ');

};


function hidebreakdowntable(){
	$('#QV04').hide();
     
};



function countryleveldisplay(){
//$('#projectdetailscontainer').empty();
$('#projectdetailscontainer').hide();
$('#QV03').animate ({position: 'absolute',left:'200px',top: '560px', width: '1100px', height: '600px'}, 1000, function() { 
$('#QV02').animate ({position: 'absolute',left:'200px',top: '50px',  width: '1000px',height: '500px'}, 1000);
qlik.resize();


});
};
                  //qlik.resize('WaMzz');   
  
function projectleveldisplay () {
$('#QV02').animate({top:'100px',left:'200px', width: '300px',height: '300px'},1000, function (){
$('#QV03').animate ({top: '100px',left: '600px',width: '300px',height:'300px'},1000,function() {
$('#projectdetailscontainer').show();
});

                  //qlik.resize('eBmJE');
});                   
   //qlik.resize();                //qlik.resize('WaMzz');
};



function removeprojectdetails() {
	$('#projectdetails').empty();
	$('#projectdetails').hide();
};

function showprojectdetails(){
	$('#projectdetailscontainer').show();
	//$('#projectdetails').css("display","block");

};

function project_pref_highlights (){
	  app.createCube({
        qDimensions: [
  
        { qDef: { qFieldDefs: ["[perf_highlights]"]}},

        ],
        qMeasures: [{
            qDef: {
                qDef: "",
                qLabel: ""
            }
        }],
        qInitialDataFetch: [{
            qHeight: 20,
            qWidth: 20
        }] 

    }, function(reply) {
       var i = 0;
       //console.log(reply.qHyperCube.qDataPages[0].qMatrix);
         $('#projectupdates').append("<H3>Performace Highlights</H3>");
        $.each(reply.qHyperCube.qDataPages[0].qMatrix, function(index, value) {
        	var info = reply.qHyperCube.qDataPages[0].qMatrix[i][0].qText; 
         $('#projectupdates').append("<BR>" + info + "<BR>");
           i = i +1;

        });
    });
};


function project_oc_progress (){
	  app.createCube({
        qDimensions: [
  
        { qDef: { qFieldDefs: ["[progress]"]}},

        ],
        qMeasures: [{
            qDef: {
                qDef: "",
                qLabel: ""
            }
        }],
        qInitialDataFetch: [{
            qHeight: 20,
            qWidth: 20
        }] 

    }, function(reply) {
       var i = 0;
       //console.log(reply.qHyperCube.qDataPages[0].qMatrix);
         $('#projectupdates').append("<H3>Progress Towards Outcome</H3>");
        $.each(reply.qHyperCube.qDataPages[0].qMatrix, function(index, value) {
        	var info = reply.qHyperCube.qDataPages[0].qMatrix[i][0].qText; 
         $('#projectupdates').append("<BR>" + info + "<BR>");
           i = i +1;

        });
    });
};


function project_oc_milestone (){
	  app.createCube({
        qDimensions: [
  
        { qDef: { qFieldDefs: ["[attainment]"]}},

        ],
        qMeasures: [{
            qDef: {
                qDef: "",
                qLabel: ""
            }
        }],
        qInitialDataFetch: [{
            qHeight: 20,
            qWidth: 20
        }] 

    }, function(reply) {
       var i = 0;
       //console.log(reply.qHyperCube.qDataPages[0].qMatrix);
         $('#projectupdates').append("<H3>Outcome Milestone Attainment</H3>");
        $.each(reply.qHyperCube.qDataPages[0].qMatrix, function(index, value) {
        	var info = reply.qHyperCube.qDataPages[0].qMatrix[i][0].qText; 
         $('#projectupdates').append("<BR>" + info + "<BR>");
           i = i +1;

        });
    });
};

function project_op_desc (){
	  app.createCube({
        qDimensions: [
  
        { qDef: { qFieldDefs: ["[outputs]"]}},

        ],
        qMeasures: [{
            qDef: {
                qDef: "",
                qLabel: ""
            }
        }],
        qInitialDataFetch: [{
            qHeight: 20,
            qWidth: 20
        }] 

    }, function(reply) {
       var i = 0;
       //console.log(reply.qHyperCube.qDataPages[0].qMatrix);
         $('#projectupdates').append("<H3>Project Outputs</H3>");
        $.each(reply.qHyperCube.qDataPages[0].qMatrix, function(index, value) {
        	var info = reply.qHyperCube.qDataPages[0].qMatrix[i][0].qText; 
         $('#projectupdates').append("<BR>" + info + "<BR>");
           i = i +1;

        });
    });
};

function project_op_results (){
	  app.createCube({
        qDimensions: [
  
        { qDef: { qFieldDefs: ["[results]"]}},

        ],
        qMeasures: [{
            qDef: {
                qDef: "",
                qLabel: ""
            }
        }],
        qInitialDataFetch: [{
            qHeight: 20,
            qWidth: 20
        }] 

    }, function(reply) {
       var i = 0;
       //console.log(reply.qHyperCube.qDataPages[0].qMatrix);
         $('#projectupdates').append("<H3>Results Achieved</H3>");
        $.each(reply.qHyperCube.qDataPages[0].qMatrix, function(index, value) {
        	var info = reply.qHyperCube.qDataPages[0].qMatrix[i][0].qText; 
         $('#projectupdates').append("<BR>" + info + "<BR>");
           i = i +1;

        });
    });
};

function project_op_milestone (){
	  app.createCube({
        qDimensions: [
  
        { qDef: { qFieldDefs: ["[attainment]"]}},

        ],
        qMeasures: [{
            qDef: {
                qDef: "",
                qLabel: ""
            }
        }],
        qInitialDataFetch: [{
            qHeight: 20,
            qWidth: 20
        }] 

    }, function(reply) {
       var i = 0;
       //console.log(reply.qHyperCube.qDataPages[0].qMatrix);
         $('#projectupdates').append("<H3>Project Output Milestone Attainment</H3>");
        $.each(reply.qHyperCube.qDataPages[0].qMatrix, function(index, value) {
        	var info = reply.qHyperCube.qDataPages[0].qMatrix[i][0].qText; 
         $('#projectupdates').append("<BR>" + info + "<BR>");
           i = i +1;

        });
    });
};

function project_imple_challenges (){
	  app.createCube({
        qDimensions: [
  
        { qDef: { qFieldDefs: ["[challenges]"]}},
        { qDef: { qFieldDefs: ["[year]"]}},////////////////////////////////////////
        ],
        qMeasures: [{
            qDef: {
                qDef: "",
                qLabel: ""
            }
        }],
        qInitialDataFetch: [{
            qHeight: 20,
            qWidth: 20
        }] 

    }, function(reply) {
       var i = 0;
       //console.log(reply.qHyperCube.qDataPages[0].qMatrix);
         $('#projectupdates').append("<H3>Challenges</H3>");
        $.each(reply.qHyperCube.qDataPages[0].qMatrix, function(index, value) {
        	var info = reply.qHyperCube.qDataPages[0].qMatrix[i][0].qText;
        	var info2 = reply.qHyperCube.qDataPages[0].qMatrix[i]["1"].qText; 
         $('#projectupdates').append("<BR>" + info2 + "<BR>");
         $('#projectupdates').append("<BR>" + info + "<BR>");
           i = i +1;

        });
    });
};

function project_imple_strategies (){
	  app.createCube({
        qDimensions: [
  
        { qDef: { qFieldDefs: ["[strategies]"]}},

        ],
        qMeasures: [{
            qDef: {
                qDef: "",
                qLabel: ""
            }
        }],
        qInitialDataFetch: [{
            qHeight: 20,
            qWidth: 20
        }] 

    }, function(reply) {
       var i = 0;
       //onsole.log(reply.qHyperCube.qDataPages[0].qMatrix);
         $('#projectupdates').append("<H3>Strategies</H3>");
        $.each(reply.qHyperCube.qDataPages[0].qMatrix, function(index, value) {
        	var info = reply.qHyperCube.qDataPages[0].qMatrix[i][0].qText;
        	var info1 = reply.qHyperCube.qDataPages[1].qMatrix[i][0].qText;  
         $('#projectupdates').append("<BR>" + info + "<BR>");
           i = i +1;

        });
    });
};



function project_lessons_learned (){
	  app.createCube({
        qDimensions: [
  
        { qDef: { qFieldDefs: ["[lessons]"]}},

        ],
        qMeasures: [{
            qDef: {
                qDef: "",
                qLabel: ""
            }
        }],
        qInitialDataFetch: [{
            qHeight: 20,
            qWidth: 20
        }] 

    }, function(reply) {
       var i = 0;
       //console.log(reply.qHyperCube.qDataPages[0].qMatrix);
         $('#projectupdates').append("<H3>Lessons learned</H3>");
        $.each(reply.qHyperCube.qDataPages[0].qMatrix, function(index, value) {
        	var info = reply.qHyperCube.qDataPages[0].qMatrix[i][0].qText; 
         $('#projectupdates').append("<BR>" + info + "<BR>");
           i = i +1;

        });
    });
};


function project_finances (){
	  app.createCube({
   qDimensions: [
  
        { qDef: { qFieldDefs: ["[year]"]}},
        { qDef: { qFieldDefs: ["[amount]"]}},////////////////////////////////////////
        ],
        qMeasures: [{
            qDef: {
                qDef: "",
                qLabel: ""
            }
        }],
        qInitialDataFetch: [{
            qHeight: 40,
            qWidth: 40
        }] 

    }, function(reply) {
       var i = 0;
       //console.log(reply.qHyperCube.qDataPages[0].qMatrix);
         //$('#projectfinances').append("<H3>Total Expenditure</H3>");
        //$.each(reply.qHyperCube.qDataPages[0].qMatrix, function(index, value) {
        	//var info = reply.qHyperCube.qDataPages[0].qMatrix[i][0].qText;
        	//console.log(info); 
        	//var info1 = reply.qHyperCube.qDataPages[1].qMatrix[i][0].qText; 
        	//console.log(info1) 
         //$('#projectfinances').append("<BR>" + info + "<BR>");
           //i = i +1;

        //});
    });
};


function project_financesvisuals (){
	app.getObject('QV07','wWwJsj');
	app.getObject('QV08','GagKmM');
	app.getObject('QV09', 'KMvgQKU');

};


//global text area event listener
function textarea(countryselected){
	$('#textarea').show()
	  app.createCube({
        qDimensions: [
  
        { qDef: { qFieldDefs: ["[ProjTitle]"]}},
        { qDef: { qFieldDefs: ["[ProgrammedBudget]"]}},

        ],
        qMeasures: [{
            qDef: {
                qDef: "",
                qLabel: ""
            }
        }],
        qInitialDataFetch: [{
            qHeight: 100,
            qWidth: 20
        }] 

    }, function(reply) {
       var i = 0;
       //console.log(reply.qHyperCube.qDataPages[0].qMatrix);
         //$('#projectupdates').append("<H3>Results Achieved</H3>");
         $('#textarea').empty();

         if (countryselected == "none")
         {
          $('#textarea').append("<div><H1> UN Environment Projects</H1></div>");
          }
          else
          {
             $('#textarea').append("<div><H1> UN Environment Projects ("+countryselected+")</H1></div>");
          }

        $.each(reply.qHyperCube.qDataPages[0].qMatrix, function(index, value) {
        	var info = reply.qHyperCube.qDataPages[0].qMatrix[i][0].qText;
        	var info2 = reply.qHyperCube.qDataPages[0].qMatrix[i][1].qText;
         $('#textarea').append(
         	"<div style ='background-color:lavender' id =" + info + "> <a href='javascript:void(0);'><p>"+info+"</p></href></div>"

         	);
           i = i +1;

        });
    });
};






var theParent = document.querySelector("#textarea");
theParent.addEventListener("click", doSomething, false);

function doSomething(e) {	
    if (e.target !== e.currentTarget) {
        var clickedItem = e.target.innerHTML;
        console.log(clickedItem);
        var country = clickedItem;
        var field = "ProjTitle";
        //var country = "Kenya";
        //var countrystring = String(country);
        //app.field(field).selectValues(["Kenya"], true, false);
        updateselection(field,country);

    }
    e.stopPropagation();
}

function updateselection(field,country){
app.field(field).selectValues([country], true, false);
}


$('#financestab').click(function(){
                	 	$('#QV04').empty();
                	 	project_finances();
                	 	project_financesvisuals();
                	 	//showbreakdowntable();
                	 });




$('#projectupdatestab').click(function(){
$('#projectupdates').empty();
project_pref_highlights();
project_oc_progress ();
project_oc_milestone ();
project_op_desc ();
project_op_results ();
project_op_milestone ();
project_imple_challenges ();
project_lessons_learned ();               	 	
                	 
                	 });

//selection state monitor

selState.OnData.bind(
        function(){

        	var length = selState.selections.length;
        	if (length == 0)
        	{
                //hidedetailscontainer();
                //removeprojectdetails();
                //hidebreakdowntable();
                //enlargeworldmap();
                //enlargescattermap();
                countryselected = "none";
                countryleveldisplay();
                textarea(countryselected);

        	}



        	if (length > 0) {
        		//console.log("a selection was made");
        		var selectionlevel = selState.selections["0"].fieldName
        		var item = selState.selections["0"].qSelected;
        		var selectionlength = selState.selections.length;
        	
        		
        		//$('#mydiv').append('<li>'  + item + '</li>' );
                if (selectionlevel == "ProjTitle")
                {
                	//console.log("you are now at the project level");
                     //projectleveldisplay
                     projectleveldisplay();
                     //shrinkworldmap();
                	 //shrinkscattermap();
                	 //showdetailscontainer();
                	makecube();
                	$('#textarea').hide();
                	//showprojectdetails();

                }

                else if (selectionlevel = "country_name")
                
                {

                //country level selection display
                //console.log("you arent at the project level");
                var countryselected = selState.selections["0"].qSelected;
                console.log(countryselected);
                countryleveldisplay();
                 textarea(countryselected);
                //hidedetailscontainer();
          

        	}
        }
    });



	if(app) {
		new AppUi( app );
	}

});
	