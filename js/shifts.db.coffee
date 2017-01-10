
Shifts.db =
    room_ids: []
    user_ids: []
    shift_ids: []
    shiftentry_ids: []
    shifttype_ids: []
    angeltype_ids: []

    init: (done) ->
        Shifts.log 'init db'
        alasql 'CREATE INDEXEDDB DATABASE IF NOT EXISTS engelsystem;
        ATTACH INDEXEDDB DATABASE engelsystem;', ->
            alasql 'USE engelsystem', ->
                # note: primary key doesn't work, see https://github.com/agershun/alasql/issues/566
                alasql 'CREATE TABLE IF NOT EXISTS Shifts (SID INT, title, shifttype_id INT, start_time INT, end_time INT, RID INT);
                CREATE TABLE IF NOT EXISTS User (UID INT, nick);
                CREATE TABLE IF NOT EXISTS Room (RID INT, Name);
                CREATE TABLE IF NOT EXISTS ShiftEntry (id INT, SID INT, TID INT, UID INT);
                CREATE TABLE IF NOT EXISTS ShiftTypes (id INT, name, angeltype_id INT);
                CREATE TABLE IF NOT EXISTS AngelTypes (id INT, name);
                CREATE TABLE IF NOT EXISTS options (option_key, option_value);', ->
                    Shifts.db.populate_ids ->
                        done()

    populate_ids: (done) ->

        # rooms
        alasql "SELECT RID from Room", (res) ->
            for r in res
                Shifts.db.room_ids.push r.RID
                # populate select filter
                Shifts.interaction.selected_rooms.push r.RID

            # users
            alasql "SELECT UID from User", (res) ->
                for u in res
                    Shifts.db.user_ids.push u.UID

                # shift types
                alasql "SELECT id from ShiftTypes", (res) ->
                    for s in res
                        Shifts.db.shifttype_ids.push s.id

                    # angel types
                    alasql "SELECT id from AngelTypes", (res) ->
                        for s in res
                            Shifts.db.angeltype_ids.push s.id
                            # populate select filter
                            Shifts.interaction.selected_angeltypes.push s.id

                        # shifts
                        alasql "SELECT SID from Shifts", (res) ->
                            for s in res
                                Shifts.db.shift_ids.push s.SID

                            # shift entries
                            alasql "SELECT id from ShiftEntry", (res) ->
                                for s in res
                                    Shifts.db.shiftentry_ids.push s.id

                                done()

    insert_room: (room, done) ->
        room.RID = parseInt(room.RID, 10)
        room_exists = room.RID in Shifts.db.room_ids
        if room_exists == false
            alasql "INSERT INTO Room (RID, Name) VALUES (#{room.RID}, '#{room.Name}')", ->
                Shifts.db.room_ids.push room.RID
                done()
        else
            done()

    insert_user: (user, done) ->
        user.UID = parseInt(user.UID, 10)
        user_exists = user.UID in Shifts.db.user_ids
        if user_exists == false
            alasql "INSERT INTO User (UID, Nick) VALUES (#{user.UID}, '#{user.Nick}')", ->
                Shifts.db.user_ids.push user.UID
                done()
        else
            done()

    insert_shift: (shift, done) ->
        shift.SID = parseInt(shift.SID, 10)
        shift.RID = parseInt(shift.RID, 10)
        shift_exists = shift.SID in Shifts.db.shift_ids
        if shift_exists == false
            alasql "INSERT INTO Shifts (SID, title, shifttype_id, start_time, end_time, RID) VALUES (#{shift.SID}, '#{shift.title}', '#{shift.shifttype_id}', '#{shift.start}', '#{shift.end}', '#{shift.RID}')", ->
                Shifts.db.shift_ids.push shift.SID
                done()
        else
            done()

    insert_shiftentry: (shiftentry, done) ->
        shiftentry.id = parseInt shiftentry.id, 10
        shiftentry_exists = shiftentry.id in Shifts.db.shiftentry_ids
        if shiftentry_exists == false
            alasql "INSERT INTO ShiftEntry (id, SID, TID, UID) VALUES (#{shiftentry.id}, '#{shiftentry.SID}', '#{shiftentry.TID}', '#{shiftentry.UID}')", ->
                Shifts.db.shiftentry_ids.push shiftentry.id
                done()
        else
            done()

    insert_shifttype: (shifttype, done) ->
        shifttype.id = parseInt shifttype.id, 10
        shifttype_exists = shifttype.id in Shifts.db.shifttype_ids
        if shifttype_exists == false
            alasql "INSERT INTO ShiftTypes (id, name) VALUES (#{shifttype.id}, '#{shifttype.name}')", ->
                Shifts.db.shifttype_ids.push shifttype.id
                done()
        else
            done()

    insert_angeltype: (angeltype, done) ->
        angeltype.id = parseInt angeltype.id, 10
        angeltype_exists = angeltype.id in Shifts.db.angeltype_ids
        if angeltype_exists == false
            alasql "INSERT INTO AngelTypes (id, name) VALUES (#{angeltype.id}, '#{angeltype.name}')", ->
                Shifts.db.angeltype_ids.push angeltype.id
                done()
        else
            done()

    get_shifts: (filter_rooms, filter_angeltypes, done) ->
        rand = 1 + parseInt(Math.random() * 10, 10)
        rand = 2000

        filter_rooms_ids = filter_rooms.join ','
        start_time = Shifts.render.get_starttime()
        end_time = Shifts.render.get_endtime()

        alasql "SELECT Shifts.SID, Shifts.title as shift_title, Shifts.shifttype_id, Shifts.start_time, Shifts.end_time, Shifts.RID,
        ShiftTypes.name as shifttype_name,
        Room.Name as room_name
        FROM Shifts
        JOIN ShiftTypes ON ShiftTypes.id = Shifts.shifttype_id
        JOIN Room ON Room.RID = Shifts.RID
        WHERE Shifts.start_time >= #{start_time} AND Shifts.end_time <= #{end_time}
        AND Shifts.RID IN (#{filter_rooms_ids})
        ORDER BY Shifts.start_time
        LIMIT #{rand}", (res) ->
            done res

    get_rooms: (done) ->
        alasql "SELECT * FROM Room ORDER BY Name", (res) ->
            done res

    get_angeltypes: (done) ->
        alasql "SELECT * FROM AngelTypes ORDER BY name", (res) ->
            done res

