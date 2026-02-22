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
        let totalCalls: Int?
        let aiHandledCalls: Int?
        let newLeads: Int?
        let appointmentsScheduled: Int?

        enum CodingKeys: String, CodingKey {
            case totalCalls = "total_calls"
            case aiHandledCalls = "ai_handled_calls"
            case newLeads = "new_leads"
            case appointmentsScheduled = "appointments_scheduled"
        }
    }

    let today: Snapshot
    let week: Snapshot
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
        case contactPhone = "contact_phone"
        case scheduledStart = "scheduled_start"
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
        case callerName = "caller_name"
        case createdAt = "created_at"
        case duration
        case status
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
        case leadStatus = "lead_status"
    }

    var displayName: String {
        let joined = [firstName, lastName].compactMap { $0 }.joined(separator: " ").trimmingCharacters(in: .whitespaces)
        return joined.isEmpty ? (phoneNumber ?? "Unknown") : joined
    }
}
