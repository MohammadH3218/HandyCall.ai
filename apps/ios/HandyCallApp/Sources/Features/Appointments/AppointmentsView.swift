import SwiftUI

@MainActor
final class AppointmentsViewModel: ObservableObject {
    @Published var appointments: [Appointment] = []
    @Published var isLoading = false
    @Published var error: String?

    func load(using api: APIClient) async {
        isLoading = true
        error = nil
        defer { isLoading = false }
        do {
            appointments = try await api.getAppointments(limit: 100)
        } catch {
            self.error = error.localizedDescription
        }
    }
}

struct AppointmentsView: View {
    @EnvironmentObject private var container: AppContainer
    @StateObject private var viewModel = AppointmentsViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading {
                    ProgressView()
                } else if let error = viewModel.error {
                    Text(error).foregroundStyle(.red)
                } else if viewModel.appointments.isEmpty {
                    ContentUnavailableView(
                        "No appointments yet",
                        systemImage: "calendar.badge.exclamationmark",
                        description: Text("Scheduled appointments will appear here.")
                    )
                } else {
                    List(viewModel.appointments) { appointment in
                        VStack(alignment: .leading, spacing: 6) {
                            Text(appointment.contactName ?? appointment.contactPhone ?? "Appointment")
                                .font(.headline)
                            Text(appointment.serviceType ?? "Service")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                            if let ms = appointment.scheduledStart {
                                Text(Date(timeIntervalSince1970: ms / 1000), format: .dateTime.month().day().hour().minute())
                                    .font(.footnote)
                                    .foregroundStyle(HandyCallTheme.emeraldDark)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Appointments")
            .task {
                await viewModel.load(using: container.apiClient)
            }
            .refreshable {
                await viewModel.load(using: container.apiClient)
            }
        }
    }
}
