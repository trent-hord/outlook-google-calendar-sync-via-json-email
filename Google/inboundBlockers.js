function processCalendarEvents() {
    var threads = GmailApp.search('subject:"BlockerEvents"');
    for (var i = 0; i < threads.length; i++) {
      var messages = threads[i].getMessages();
      for (var j = 0; j < messages.length; j++) {
        var message = messages[j];
        if (message.getSubject() === "BlockerEvents") {
          var body = message.getPlainBody();
          try {
            var events = JSON.parse(body);
            if (Array.isArray(events)) {
              // Delete events not in JSON (process deletions *before* updates/creations)
              deleteEventsNotInJson(events);
  
              // Process each event from the email
              events.forEach(function(event) {
                processCalendarEvent(event);
              });
  
              message.markRead(); // Mark as read after all events are processed.
  
              // Delete the email
              message.getThread().moveToTrash(); // Move the thread to the trash
  
            } else {
              Logger.log("Email body is not a valid JSON array.");
            }
          } catch (e) {
            Logger.log("Error parsing JSON: " + e);
          }
        }
      }
    }
  }
  
  function processCalendarEvent(event) {
    try {
      var calendar = CalendarApp.getDefaultCalendar();
      var startDate = new Date(event.startWithTimeZone);
      var endDate = new Date(event.endWithTimeZone);
  
      // Get today's date
      var today = new Date();
      today.setHours(0, 0, 0, 0); // Set time to midnight
  
      // Calculate date range
      var daysPrior = 3; // Set how many days before today
      var daysAfter = 7;  // Set how many days after today
  
      var startDateRange = new Date(today);
      startDateRange.setDate(today.getDate() - daysPrior);
      startDateRange.setHours(0, 0, 0, 0); // Start of day
  
      var endDateRange = new Date(today);
      endDateRange.setDate(today.getDate() + daysAfter);
      endDateRange.setHours(23, 59, 59, 999); // End of day
  
      // Get events within the date range
      var allEvents = calendar.getEvents(startDateRange, endDateRange);
      var existingEvent = null;
  
      // Search for an event with matching iCalUId in the location
      for (var i = 0; i < allEvents.length; i++) {
        if (allEvents[i].getLocation() === event.iCalUId) {
          existingEvent = allEvents[i];
          break;
        }
      }
  
      if (existingEvent) {
        // Event exists, check for updates
        if (existingEvent.getTitle() !== event.subject ||
            existingEvent.getStartTime().getTime() !== startDate.getTime() ||
            existingEvent.getEndTime().getTime() !== endDate.getTime()) {
  
          existingEvent.setTitle(event.subject);
          existingEvent.setTime(startDate, endDate);
          existingEvent.setDescription("Event start with timezone: " + event.startWithTimeZone + "\nEvent end with timezone: " + event.endWithTimeZone);
  
          Logger.log("Calendar event updated: " + event.subject);
        } else {
          Logger.log("Calendar event already up to date: " + event.subject);
        }
      } else {
        // Event does not exist, create it
        calendar.createEvent(event.subject, startDate, endDate, {
          location: event.iCalUId,
          description: "Event start with timezone: " + event.startWithTimeZone + "\nEvent end with timezone: " + event.endWithTimeZone
        });
        Logger.log("Calendar event created: " + event.subject);
      }
    } catch (e) {
      Logger.log("Error processing calendar event: " + e);
    }
  }
  
  function deleteEventsNotInJson(eventsFromJson) {
    try {
      var calendar = CalendarApp.getDefaultCalendar();
  
      // Get today's date
      var today = new Date();
      today.setHours(0, 0, 0, 0); // Set time to midnight
  
      // Calculate date range
      var daysPrior = 3; // Set how many days before today
      var daysAfter = 7;  // Set how many days after today
  
      var startDateRange = new Date(today);
      startDateRange.setDate(today.getDate() - daysPrior);
      startDateRange.setHours(0, 0, 0, 0); // Start of day
  
      var endDateRange = new Date(today);
      endDateRange.setDate(today.getDate() + daysAfter);
      endDateRange.setHours(23, 59, 59, 999); // End of day
  
      // Get calendar events with "Blocker" within the date range
      var calendarEvents = calendar.getEvents(startDateRange, endDateRange, { search: "Blocker" });
  
      // Build an array of iCalUIds from the JSON data
      var iCalUIdsInJson = eventsFromJson.map(function(event) {
        return event.iCalUId;
      });
  
      // Iterate through calendar events and delete those not in the JSON
      for (var i = 0; i < calendarEvents.length; i++) {
        var calendarEvent = calendarEvents[i];
        if (iCalUIdsInJson.indexOf(calendarEvent.getLocation()) === -1) {
          // iCalUId not found in the JSON, delete the event
          calendarEvent.deleteEvent();
          Logger.log("Calendar event deleted: " + calendarEvent.getTitle() + " (iCalUId: " + calendarEvent.getLocation() + ")");
        }
      }
    } catch (e) {
      Logger.log("Error deleting events: " + e);
    }
  }