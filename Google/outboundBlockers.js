function getAndEmailFilteredCalendarEvents() {
    // Configuration variables
    var daysPrior = 3;
    var daysAfter = 7;
    var calendarId = 'primary';
    var recipientEmail = 'destination@contoso.com';
    var exclusionString = 'Blocker';
  
    var calendar = CalendarApp.getCalendarById(calendarId);
  
    // Calculate start and end dates.
    var now = new Date();
    var startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysPrior);
    var endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysAfter);
  
    // Get and filter events.
    var events = calendar.getEvents(startDate, endDate);
    var filteredEvents = events.filter(function(event) {
      return event.getTitle().indexOf(exclusionString) === -1;
    });
  
    // Convert to JSON (using iCalUID instead of id).
    var eventData = filteredEvents.map(function(event) {
      return {
        title: event.getTitle(),
        startTime: event.getStartTime().toISOString(),
        endTime: event.getEndTime().toISOString(),
        iCalUID: event.getId() // Get the iCalUID
      };
    });
  
    // Create and send email.
    var emailBody = JSON.stringify(eventData, null, 2);
    MailApp.sendEmail({
      to: recipientEmail,
      subject: 'BlockerEvents',
      body: emailBody
    });
  }