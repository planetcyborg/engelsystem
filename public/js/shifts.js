var Shifts;

Shifts = window.Shifts || {
  db: {
    room_ids: [],
    user_ids: [],
    shift_ids: [],
    shiftentry_ids: [],
    shifttype_ids: [],
    init: function(done) {
      Shifts.log('init db');
      return alasql('CREATE INDEXEDDB DATABASE IF NOT EXISTS engelsystem; ATTACH INDEXEDDB DATABASE engelsystem;', function() {
        return alasql('USE engelsystem', function() {
          return alasql('CREATE TABLE IF NOT EXISTS Shifts (SID INT, title, shifttype_id INT, shift_start INT, shift_end INT, RID INT); CREATE TABLE IF NOT EXISTS User (UID INT, nick); CREATE TABLE IF NOT EXISTS Room (RID INT, Name); CREATE TABLE IF NOT EXISTS ShiftEntry (id INT, SID INT, TID INT, UID INT); CREATE TABLE IF NOT EXISTS ShiftTypes (id INT, name, angeltype_id INT); CREATE TABLE IF NOT EXISTS options (option_key, option_value);', function() {
            return Shifts.db.populate_ids(function() {
              return done();
            });
          });
        });
      });
    },
    populate_ids: function(done) {
      return alasql("SELECT RID from Room", function(res) {
        var j, len, r;
        for (j = 0, len = res.length; j < len; j++) {
          r = res[j];
          Shifts.db.room_ids.push(r.RID);
        }
        return alasql("SELECT UID from User", function(res) {
          var k, len1, u;
          for (k = 0, len1 = res.length; k < len1; k++) {
            u = res[k];
            Shifts.db.user_ids.push(u.UID);
          }
          return alasql("SELECT id from ShiftTypes", function(res) {
            var l, len2, s;
            for (l = 0, len2 = res.length; l < len2; l++) {
              s = res[l];
              Shifts.db.shifttype_ids.push(s.id);
            }
            return alasql("SELECT SID from Shifts", function(res) {
              var len3, m;
              for (m = 0, len3 = res.length; m < len3; m++) {
                s = res[m];
                Shifts.db.shift_ids.push(s.SID);
              }
              return alasql("SELECT id from ShiftEntry", function(res) {
                var len4, n;
                for (n = 0, len4 = res.length; n < len4; n++) {
                  s = res[n];
                  Shifts.db.shiftentry_ids.push(s.id);
                }
                return done();
              });
            });
          });
        });
      });
    },
    insert_room: function(room, done) {
      var room_exists;
      room_exists = Shifts.db.room_ids.indexOf(parseInt(room.RID, 10)) > -1;
      if (room_exists === false) {
        return alasql("INSERT INTO Room (RID, Name) VALUES (" + room.RID + ", '" + room.Name + "')", function() {
          Shifts.db.room_ids.push(room.RID);
          return done();
        });
      } else {
        return done();
      }
    },
    insert_user: function(user, done) {
      var user_exists;
      user_exists = Shifts.db.user_ids.indexOf(parseInt(user.UID, 10)) > -1;
      if (user_exists === false) {
        return alasql("INSERT INTO User (UID, Nick) VALUES (" + user.UID + ", '" + user.Nick + "')", function() {
          Shifts.db.user_ids.push(user.UID);
          return done();
        });
      } else {
        return done();
      }
    },
    insert_shift: function(shift, done) {
      var shift_exists;
      shift_exists = Shifts.db.shift_ids.indexOf(parseInt(shift.SID, 10)) > -1;
      if (shift_exists === false) {
        return alasql("INSERT INTO Shifts (SID, title, shifttype_id, shift_start, shift_end, RID) VALUES (" + shift.SID + ", '" + shift.title + "', '" + shift.shifttype_id + "', '" + shift.start + "', '" + shift.end + "', '" + shift.RID + "')", function() {
          Shifts.db.shift_ids.push(shift.SID);
          return done();
        });
      } else {
        return done();
      }
    },
    insert_shiftentry: function(shiftentry, done) {
      var shiftentry_exists;
      shiftentry_exists = Shifts.db.shiftentry_ids.indexOf(parseInt(shiftentry.id, 10)) > -1;
      if (shiftentry_exists === false) {
        return alasql("INSERT INTO ShiftEntry (id, SID, TID, UID) VALUES (" + shiftentry.id + ", '" + shiftentry.SID + "', '" + shiftentry.TID + "', '" + shiftentry.UID + "')", function() {
          Shifts.db.shiftentry_ids.push(shiftentry.id);
          return done();
        });
      } else {
        return done();
      }
    },
    insert_shifttype: function(shifttype, done) {
      var shifttype_exists;
      shifttype.id = parseInt(shifttype.id, 10);
      shifttype_exists = Shifts.db.shifttype_ids.indexOf(shifttype.id) > -1;
      if (shifttype_exists === false) {
        return alasql("INSERT INTO ShiftTypes (id, name) VALUES (" + shifttype.id + ", '" + shifttype.name + "')", function() {
          Shifts.db.shifttype_ids.push(shifttype.id);
          return done();
        });
      } else {
        return done();
      }
    },
    get_my_shifts: function(done) {
      var rand;
      rand = 1 + parseInt(Math.random() * 10, 10);
      rand = 100;
      return alasql("SELECT Shifts.SID, Shifts.title as shift_title, Shifts.shifttype_id, Shifts.shift_start, Shifts.shift_end, Shifts.RID, ShiftTypes.name as shifttype_name, Room.Name as room_name FROM Shifts LEFT JOIN ShiftTypes ON ShiftTypes.id = Shifts.shifttype_id LEFT JOIN Room ON Room.RID = Shifts.RID LIMIT " + rand, function(res) {
        return done(res);
      });
    },
    get_rooms: function(done) {
      return alasql("SELECT * FROM Room", function(res) {
        return done(res);
      });
    }
  },
  fetcher: {
    start: function(done) {
      var url;
      url = '?p=shifts_json_export_websql';
      return $.get(url, function(data) {
        var rooms;
        rooms = data.rooms;
        Shifts.$shiftplan.html('fetching rooms...');
        return Shifts.fetcher.process(Shifts.db.insert_room, rooms, function() {
          var users;
          Shifts.log('processing rooms done');
          users = data.users;
          Shifts.$shiftplan.html('fetching users...');
          return Shifts.fetcher.process(Shifts.db.insert_user, users, function() {
            var shift_types;
            Shifts.log('processing users done');
            shift_types = data.shift_types;
            Shifts.$shiftplan.html('fetching shift_types...');
            return Shifts.fetcher.process(Shifts.db.insert_shifttype, shift_types, function() {
              var shifts;
              Shifts.log('processing shift_types done');
              shifts = data.shifts;
              Shifts.$shiftplan.html('fetching shifts...');
              return Shifts.fetcher.process(Shifts.db.insert_shift, shifts, function() {
                var shift_entries;
                Shifts.log('processing shifts done');
                shift_entries = data.shift_entries;
                Shifts.$shiftplan.html('fetching shift entries...');
                return Shifts.fetcher.process(Shifts.db.insert_shiftentry, shift_entries, function() {
                  Shifts.log('processing shift_entries done');
                  Shifts.$shiftplan.html('done.');
                  return done();
                });
              });
            });
          });
        });
      });
    },
    process: function(processing_func, items_to_process, done) {
      var item;
      if (items_to_process.length > 0) {
        item = items_to_process.shift();
        return processing_func(item, function() {
          return Shifts.fetcher.process(processing_func, items_to_process, done);
        });
      } else {
        return done();
      }
    }
  },
  render: {
    SECONDS_PER_ROW: 900,
    BLOCK_HEIGHT: 30,
    MARGIN: 5,
    TIME_MARGIN: 1800,
    tick: function(time, label) {
      if (label == null) {
        label = false;
      }
      if (time % (24 * 60 * 60) === 23 * 60 * 60) {
        if (label) {
          return {
            tick_day: true,
            label: moment.unix(time).format('MM-DD HH:mm')
          };
        } else {
          return {
            tick_day: true
          };
        }
      } else if (time % (60 * 60) === 0) {
        if (label) {
          return {
            tick_hour: true,
            label: moment.unix(time).format('HH:mm')
          };
        } else {
          return {
            tick_hour: true
          };
        }
      } else {
        return {
          tick: true
        };
      }
    },
    timelane: function() {
      var i, j, start_time, thistime, time_slot;
      time_slot = [];
      start_time = moment(moment().format('YYYY-MM-DD')).format('X');
      start_time = parseInt(start_time, 10);
      start_time = start_time - Shifts.render.TIME_MARGIN;
      for (i = j = 0; j <= 100; i = ++j) {
        thistime = start_time + i * Shifts.render.SECONDS_PER_ROW;
        time_slot.push(Shifts.render.tick(thistime, true));
      }
      return time_slot;
    },
    shiftplan: function() {
      return Shifts.db.get_rooms(function(rooms) {
        return Shifts.db.get_my_shifts(function(db_shifts) {
          var add_shift, highest_lane_nr, j, k, lane, lane_nr, lanes, len, len1, mustache_rooms, r, ref, room_id, s, shift, shift_added, shift_fits, tpl;
          lanes = {};
          add_shift = function(shift, room_id) {
            var lane_nr;
            for (lane_nr in lanes[room_id]) {
              if (shift_fits(shift, room_id, lane_nr)) {
                lanes[room_id][lane_nr].push(shift);
                return true;
              }
            }
            return false;
          };
          shift_fits = function(shift, room_id, lane_nr) {
            var j, lane_shift, len, ref;
            ref = lanes[room_id][lane_nr];
            for (j = 0, len = ref.length; j < len; j++) {
              lane_shift = ref[j];
              if (!(shift.shift_start >= lane_shift.shift_end || shift.shift_end <= lane_shift.shift_start)) {
                return false;
              }
            }
            return true;
          };
          for (j = 0, len = db_shifts.length; j < len; j++) {
            shift = db_shifts[j];
            room_id = shift.RID;
            if (typeof lanes[room_id] === "undefined") {
              lanes[room_id] = [[]];
            }
            shift_added = false;
            ref = lanes[room_id];
            for (k = 0, len1 = ref.length; k < len1; k++) {
              lane = ref[k];
              shift_added = add_shift(shift, room_id);
              if (shift_added) {
                break;
              }
            }
            if (!shift_added) {
              Shifts.log("lane is full, adding new one");
              lanes[room_id].push([]);
              highest_lane_nr = lanes[room_id].length - 1;
              add_shift(shift, room_id);
            }
          }
          mustache_rooms = [];
          for (r in rooms) {
            room_id = rooms[r].RID;
            mustache_rooms[r] = {};
            mustache_rooms[r].Name = rooms[r].Name;
            mustache_rooms[r].lanes = [];
            for (lane_nr in lanes[room_id]) {
              mustache_rooms[r].lanes[lane_nr] = {};
              mustache_rooms[r].lanes[lane_nr].shifts = [];
              for (s in lanes[room_id][lane_nr]) {
                mustache_rooms[r].lanes[lane_nr].shifts = lanes[room_id][lane_nr];
              }
            }
          }
          Shifts.log("mustache_rooms:");
          Shifts.log(mustache_rooms);
          tpl = '';
          tpl += Mustache.render(Shifts.template.filter_form);
          tpl += Mustache.render(Shifts.template.shift_calendar, {
            rooms: mustache_rooms,
            timelane_ticks: Shifts.render.timelane()
          });
          return Shifts.$shiftplan.html(tpl);
        });
      });
    }
  },
  init: function() {
    Shifts.$shiftplan = $('#shiftplan');
    if (Shifts.$shiftplan.length > 0) {
      Shifts.log('shifts init');
      Shifts.db.init(function() {
        Shifts.log('db initialized');
        return Shifts.fetcher.start(function() {
          Shifts.log('fetch complete.');
          return Shifts.render.shiftplan();
        });
      });
      return $('body').on('click', '#filterbutton', function() {
        Shifts.render.shiftplan();
        return false;
      });
    }
  },
  log: function(msg) {
    return console.info(msg);
  },
  template: {
    filter_form: '<form class="form-inline" action="" method="get"> <input type="hidden" name="p" value="user_shifts"> <div class="row"> <div class="col-md-6"> <h1>%title%</h1> <div class="form-group">%start_select%</div> <div class="form-group"> <div class="input-group"> <input class="form-control" type="text" id="start_time" name="start_time" size="5" pattern="^\d{1,2}:\d{2}$" placeholder="HH:MM" maxlength="5" value="%start_time%"> <div class="input-group-btn"> <button class="btn btn-default" title="Now" type="button" onclick=""> <span class="glyphicon glyphicon-time"></span> </button> </div> </div> </div> &#8211; <div class="form-group">%end_select%</div> <div class="form-group"> <div class="input-group"> <input class="form-control" type="text" id="end_time" name="end_time" size="5" pattern="^\d{1,2}:\d{2}$" placeholder="HH:MM" maxlength="5" value="%end_time%"> <div class="input-group-btn"> <button class="btn btn-default" title="Now" type="button" onclick=""> <span class="glyphicon glyphicon-time"></span> </button> </div> </div> </div> </div> <div class="col-md-2">%room_select%</div> <div class="col-md-2">%type_select%</div> <div class="col-md-2">%filled_select%</div> </div> <div class="row"> <div class="col-md-6"> <div>%task_notice%</div> <input id="filterbutton" class="btn btn-primary" type="submit" style="width: 75%; margin-bottom: 20px" value="%filter%"> </div> </div> </form>',
    shift_calendar: '<div class="shift-calendar"> <div class="lane time"> <div class="header">Time</div> {{#timelane_ticks}} {{#tick}} <div class="tick"></div> {{/tick}} {{#tick_hour}} <div class="tick hour">{{label}}</div> {{/tick_hour}} {{#tick_day}} <div class="tick day">{{label}}</div> {{/tick_day}} {{/timelane_ticks}} </div> {{#rooms}} {{#lanes}} <div class="lane"> <div class="header"> <a href="?p=rooms&action=view&room_id={{RID}}"><span class="glyphicon glyphicon-map-marker"></span> {{Name}}</a> </div> {{#shifts}} {{#tick}} <div class="tick"></div> {{/tick}} {{#tick_hour}} <div class="tick hour">{{text}}</div> {{/tick_hour}} {{#tick_day}} <div class="tick day">{{text}}</div> {{/tick_day}} {{#shift}} <div class="shift panel panel-success" style="height: 235px;"> <div class="panel-heading"> <a href="?p=shifts&amp;action=view&amp;shift_id=2696">00:00 ‐ 02:00 — {{name}}</a> <div class="pull-right"> <div class="btn-group"> <a href="?p=user_shifts&amp;edit_shift=2696" class="btn btn-default btn-xs"><span class="glyphicon glyphicon-edit"></span></a> <a href="?p=user_shifts&amp;delete_shift=2696" class="btn btn-default btn-xs"><span class="glyphicon glyphicon-trash"></span></a> </div> </div> </div> <div class="panel-body"> <span class="glyphicon glyphicon-info-sign"></span> {{title}}<br /> <a href="?p=rooms&amp;action=view&amp;room_id=42"><span class="glyphicon glyphicon-map-marker"></span> Bottle Sorting (Hall H)</a> </div> <ul class="list-group"> <li class="list-group-item"><strong><a href="?p=angeltypes&amp;action=view&amp;angeltype_id=104575">Angel</a>:</strong> <span style=""><a class="" href="?p=users&amp;action=view&amp;user_id=1755"><span class="icon-icon_angel"></span> Pantomime</a></span>, <span style=""><a class="" href="?p=users&amp;action=view&amp;user_id=50"><span class="icon-icon_angel"></span> sandzwerg</a></span> </li> <li class="list-group-item"> <a href="?p=user_shifts&amp;shift_id=2696&amp;type_id=104575" class="btn btn-default btn-xs">Neue Engel hinzufügen</a> </li> </ul> <div class="shift-spacer"></div> </div> {{/shift}} {{/shifts}} </div> {{/lanes}} {{/rooms}} </div>'
  }
};

$(function() {
  return Shifts.init();
});
