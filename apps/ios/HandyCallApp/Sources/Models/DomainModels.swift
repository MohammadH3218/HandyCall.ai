import Foundation

struct Company: Decodable {
    let companyID: String
    let companyName: String
    let timezone: String?
    let serviceType: String?
    let status: String?

    enum CodingKeys: String, CodingKey {
        case companyID = "company_id"
        case companyName = "company_name"
        case timezone
        case serviceType = "service_type"
        case status
    }
}

struct DashboardStats: Decodable {
    struct Snapshot: Decodable {
        let totalCalls: Int
        let aiHandledCalls: Int
        let newLeads: Int
        let appointmentsScheduled: Int
    }

    let today: Snapshot
    let week: Snapshot
    let pendingQuestions: Int

    enum CodingKeys: String, CodingKey {
        case today
        case week
        case todayCalls
        case newLeads
        case appointments
        case pendingQuestions
    }

    enum SnapshotCodingKeys: String, CodingKey {
        case totalCalls = "total_calls"
        case aiHandledCalls = "ai_handled_calls"
        case newLeads = "new_leads"
        case appointmentsScheduled = "appointments_scheduled"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)

        if container.contains(.today) || container.contains(.week) {
            let todayContainer = try? container.nestedContainer(keyedBy: SnapshotCodingKeys.self, forKey: .today)
            let weekContainer = try? container.nestedContainer(keyedBy: SnapshotCodingKeys.self, forKey: .week)
            let parsedTodayCalls = todayContainer?.decodeLossyInt(forKey: .totalCalls) ?? 0
            let parsedTodayLeads = todayContainer?.decodeLossyInt(forKey: .newLeads) ?? 0
            let parsedTodayAppointments = todayContainer?.decodeLossyInt(forKey: .appointmentsScheduled) ?? 0
            let parsedTodayAiHandled = todayContainer?.decodeLossyInt(forKey: .aiHandledCalls) ?? 0
            let parsedWeekCalls = weekContainer?.decodeLossyInt(forKey: .totalCalls) ?? parsedTodayCalls
            let parsedWeekLeads = weekContainer?.decodeLossyInt(forKey: .newLeads) ?? parsedTodayLeads
            let parsedWeekAppointments = weekContainer?.decodeLossyInt(forKey: .appointmentsScheduled) ?? parsedTodayAppointments
            let parsedWeekAiHandled = weekContainer?.decodeLossyInt(forKey: .aiHandledCalls) ?? parsedTodayAiHandled

            today = Snapshot(
                totalCalls: parsedTodayCalls,
                aiHandledCalls: parsedTodayAiHandled,
                newLeads: parsedTodayLeads,
                appointmentsScheduled: parsedTodayAppointments
            )
            week = Snapshot(
                totalCalls: parsedWeekCalls,
                aiHandledCalls: parsedWeekAiHandled,
                newLeads: parsedWeekLeads,
                appointmentsScheduled: parsedWeekAppointments
            )
            pendingQuestions = container.decodeLossyInt(forKey: .pendingQuestions) ?? 0
            return
        }

        // Current backend shape is flat. Map that into today + week to keep UI stable.
        let calls = container.decodeLossyInt(forKey: .todayCalls) ?? 0
        let leads = container.decodeLossyInt(forKey: .newLeads) ?? 0
        let appointmentsCount = container.decodeLossyInt(forKey: .appointments) ?? 0
        let pending = container.decodeLossyInt(forKey: .pendingQuestions) ?? 0
        today = Snapshot(totalCalls: calls, aiHandledCalls: 0, newLeads: leads, appointmentsScheduled: appointmentsCount)
        week = Snapshot(totalCalls: calls, aiHandledCalls: 0, newLeads: leads, appointmentsScheduled: appointmentsCount)
        pendingQuestions = pending
    }
}

struct Appointment: Decodable, Identifiable {
    var id: String { appointmentID }

    let appointmentID: String
    let status: String?
    let serviceType: String?
    let contactName: String?
    let contactPhone: String?
    let scheduledStart: Double?

    enum CodingKeys: String, CodingKey {
        case appointmentID = "appointment_id"
        case status
        case serviceType = "service_type"
        case contactName = "contact_name"
        case firstName = "first_name"
        case lastName = "last_name"
        case contactPhone = "contact_phone"
        case phoneNumber = "phone_number"
        case scheduledStart = "scheduled_start"
        case scheduledTime = "scheduled_time"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        appointmentID = try container.decode(String.self, forKey: .appointmentID)
        status = try? container.decode(String.self, forKey: .status)
        serviceType = try? container.decode(String.self, forKey: .serviceType)

        let explicitContactName = try? container.decode(String.self, forKey: .contactName)
        let firstName = try? container.decode(String.self, forKey: .firstName)
        let lastName = try? container.decode(String.self, forKey: .lastName)
        let combinedName = [firstName, lastName]
            .compactMap { $0?.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
            .joined(separator: " ")
        contactName = explicitContactName?.trimmingCharacters(in: .whitespacesAndNewlines).nonEmpty ?? combinedName.nonEmpty

        contactPhone = container.decodeLossyString(forAnyOfKeys: [.contactPhone, .phoneNumber])

        if let parsedStart = container.decodeLossyDouble(forKey: .scheduledStart) {
            scheduledStart = parsedStart
        } else if
            let scheduledTime = try? container.decode(String.self, forKey: .scheduledTime),
            let timestamp = ISO8601DateFormatter().date(from: scheduledTime)?.timeIntervalSince1970
        {
            scheduledStart = timestamp * 1000
        } else {
            scheduledStart = nil
        }
    }
}

struct CallItem: Decodable, Identifiable {
    var id: String { callID }

    let callID: String
    let callerPhone: String?
    let callerName: String?
    let createdAt: String?
    let duration: Double?
    let status: String?

    enum CodingKeys: String, CodingKey {
        case callID = "call_id"
        case callerPhone = "caller_phone"
        case fromNumber = "from_number"
        case callerName = "caller_name"
        case createdAt = "created_at"
        case duration
        case durationSeconds = "duration_seconds"
        case status
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        callID = try container.decode(String.self, forKey: .callID)
        callerPhone = container.decodeLossyString(forAnyOfKeys: [.callerPhone, .fromNumber])
        callerName = try? container.decode(String.self, forKey: .callerName)
        status = try? container.decode(String.self, forKey: .status)
        duration = container.decodeLossyDouble(forAnyOfKeys: [.duration, .durationSeconds])

        if let iso = try? container.decode(String.self, forKey: .createdAt) {
            createdAt = iso
        } else if let milliseconds = container.decodeLossyDouble(forKey: .createdAt) {
            createdAt = Date(timeIntervalSince1970: milliseconds > 10_000_000_000 ? milliseconds / 1000 : milliseconds).ISO8601Format()
        } else {
            createdAt = nil
        }
    }
}

struct ContactItem: Decodable, Identifiable {
    var id: String { contactID }

    let contactID: String
    let firstName: String?
    let lastName: String?
    let phoneNumber: String?
    let leadStatus: String?

    enum CodingKeys: String, CodingKey {
        case contactID = "contact_id"
        case firstName = "first_name"
        case lastName = "last_name"
        case phoneNumber = "phone_number"
        case phone
        case name
        case leadStatus = "lead_status"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        contactID = try container.decode(String.self, forKey: .contactID)
        var parsedFirstName = try? container.decode(String.self, forKey: .firstName)
        var parsedLastName = try? container.decode(String.self, forKey: .lastName)
        leadStatus = try? container.decode(String.self, forKey: .leadStatus)

        if let normalizedPhone = container.decodeLossyString(forKey: .phoneNumber) {
            phoneNumber = normalizedPhone
        } else {
            phoneNumber = container.decodeLossyString(forKey: .phone)
        }

        if parsedFirstName == nil && parsedLastName == nil, let fullName = try? container.decode(String.self, forKey: .name) {
            let parts = fullName.split(separator: " ", maxSplits: 1, omittingEmptySubsequences: true).map(String.init)
            if let first = parts.first {
                parsedFirstName = first
            }
            if parts.count > 1 {
                parsedLastName = parts[1]
            }
        }
        firstName = parsedFirstName
        lastName = parsedLastName
    }

    var displayName: String {
        let joined = [firstName, lastName].compactMap { $0 }.joined(separator: " ").trimmingCharacters(in: .whitespaces)
        return joined.isEmpty ? (phoneNumber ?? "Unknown") : joined
    }
}

private extension String {
    var nonEmpty: String? {
        let trimmed = trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }
}

private extension KeyedDecodingContainer {
    func decodeLossyString(forKey key: Key) -> String? {
        if let value = try? decodeIfPresent(String.self, forKey: key) {
            return value
        }
        if let value = try? decodeIfPresent(Int.self, forKey: key) {
            return String(value)
        }
        if let value = try? decodeIfPresent(Double.self, forKey: key) {
            return String(value)
        }
        return nil
    }

    func decodeLossyString(forAnyOfKeys keys: [Key]) -> String? {
        for key in keys {
            if let value = decodeLossyString(forKey: key) {
                return value
            }
        }
        return nil
    }

    func decodeLossyDouble(forKey key: Key) -> Double? {
        if let value = try? decodeIfPresent(Double.self, forKey: key) {
            return value
        }
        if let value = try? decodeIfPresent(Int.self, forKey: key) {
            return Double(value)
        }
        if let text = try? decodeIfPresent(String.self, forKey: key) {
            return Double(text)
        }
        return nil
    }

    func decodeLossyDouble(forAnyOfKeys keys: [Key]) -> Double? {
        for key in keys {
            if let value = decodeLossyDouble(forKey: key) {
                return value
            }
        }
        return nil
    }

    func decodeLossyInt(forKey key: Key) -> Int? {
        if let value = try? decodeIfPresent(Int.self, forKey: key) {
            return value
        }
        if let value = try? decodeIfPresent(Double.self, forKey: key) {
            return Int(value)
        }
        if let text = try? decodeIfPresent(String.self, forKey: key), let parsed = Int(text) {
            return parsed
        }
        return nil
    }
}
