import Foundation

struct LoginRequest: Encodable {
    let email: String
    let password: String
}

struct LoginResponse: Decodable {
    let accessToken: String
    let idToken: String
    let refreshToken: String?
    let email: String?
    let userRole: String?

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case idToken = "id_token"
        case refreshToken = "refresh_token"
        case email
        case userRole
    }
}

struct RefreshResponse: Decodable {
    let accessToken: String
    let idToken: String

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case idToken = "id_token"
    }
}

struct AuthSession: Codable {
    let accessToken: String
    let idToken: String
    let refreshToken: String?
    let email: String
}
