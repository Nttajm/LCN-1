import time
import random
import threading
import re
import datetime

command_history = []
response_history = []
log_entries = []
user_data = {}
available_commands = {
    "time": "Display the current time",
    "calc": "Perform basic arithmetic calculations",
    "help": "Display a list of available commands and their descriptions",
    "bk": "Execute the last command",
    "rec": "Execute the last response",
    "timex": "Display the current date and time with live seconds",
    "lcn": "Visit lcnjoel.com",
    "reset": "Clear the session and start over",
    "rand": "Generate a random number between the specified range (e.g., 'rand(x-y)'",
    "timer": "Start a timer (e.g., 'timer(01:00:23)')",
    "timeu": "Interactively view the time in different time zones and regions",
    "timeus": "Show time zones in the United States",
    "flip coin": "Flip a coin and output 'heads' or 'tails'",
    "config log": "Configure logging options",
    "show log": "Display the current user configuration data and log entries",
    "log": "Save a log entry",
    "run js/": "Run JavaScript code and display the output",
    "pass": "Prompt user for password and store it",
}

timex_thread = None
timer_thread = None
rec_thread = None
is_awaiting_password = False
password = ""

def run_command(command):
    global timex_thread, timer_thread, rec_thread, is_awaiting_password, password
    
    if is_awaiting_password:
        password = command
        is_awaiting_password = False
        print("Password set successfully.")
        return
    
    if command.lower() == "pass":
        is_awaiting_password = True
        print("Enter your password:")
        return
    
    if timex_thread and timex_thread.is_alive():
        timex_thread.do_run = False

    if timer_thread and timer_thread.is_alive():
        timer_thread.do_run = False

    if rec_thread and rec_thread.is_alive():
        rec_thread.do_run = False

    response = ""
    if command.lower() == "hello":
        response = user_data.get("name", "Hello! Welcome to the DB&M PowerShell. For help, simply type 'help'.")
    elif command.lower() == "time":
        response = time.strftime("%I:%M%p").lower()
    elif command.lower() == "timex":
        def timex_function():
            t = threading.currentThread()
            while getattr(t, "do_run", True):
                print(datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
                time.sleep(1)
        
        timex_thread = threading.Thread(target=timex_function)
        timex_thread.start()
        return
    elif command.lower().startswith("calc"):
        expression = command[5:].strip()
        try:
            response = eval(expression)
        except Exception as e:
            response = f"Error: {e}"
    elif command.lower() == "lcn":
        response = "Visit https://lcnjoel.com"
    elif command.lower() == "help":
        response = "Available Commands:\n"
        for cmd, desc in available_commands.items():
            response += f"{cmd} - {desc}\n"
    elif command.lower() == "bk":
        if command_history:
            last_command = command_history[-1]
            run_command(last_command)
            return
        else:
            response = "No previous command"
    elif command.lower() == "rec":
        if response_history:
            last_response = response_history[-1]
            run_command(last_response)
            return
        else:
            response = "No previous response"
    elif command.lower() == "reset":
        command_history.clear()
        response_history.clear()
        print("Session has been reset.")
        return
    elif command.lower().startswith("rand"):
        match = re.match(r"rand\((\d+)-(\d+)\)", command)
        if match:
            min_val = int(match.group(1))
            max_val = int(match.group(2))
            response = f"Random number between {min_val} and {max_val}: {random.randint(min_val, max_val)}"
        else:
            response = "Invalid 'rand' command format. Use 'rand(x-y)' to specify the range."
    elif command.lower().startswith("timer"):
        match = re.match(r"timer\((\d{2}:\d{2}:\d{2})\)", command)
        if match:
            time_string = match.group(1)
            hours, minutes, seconds = map(int, time_string.split(":"))
            total_seconds = hours * 3600 + minutes * 60 + seconds
            remaining_seconds = total_seconds

            def timer_function():
                t = threading.currentThread()
                while getattr(t, "do_run", True) and remaining_seconds > 0:
                    time.sleep(1)
                    remaining_seconds -= 1
                    display_hours = str(remaining_seconds // 3600).zfill(2)
                    display_minutes = str((remaining_seconds % 3600) // 60).zfill(2)
                    display_seconds = str(remaining_seconds % 60).zfill(2)
                    print(f"Timer: {display_hours}:{display_minutes}:{display_seconds}")
                if remaining_seconds <= 0:
                    print("Timer finished.")
            
            timer_thread = threading.Thread(target=timer_function)
            timer_thread.start()
            return
        else:
            response = "Invalid 'timer' command format. Use 'timer(HH:MM:SS)' to specify the time."
    elif command.lower().startswith("flip coin"):
        match = re.match(r"flip coin\*\)(\d+)", command)
        repetitions = int(match.group(1)) if match else 1
        flips = [random.choice(["Heads", "Tails"]) for _ in range(repetitions)]
        response = ", ".join(flips)
    elif command.lower().startswith("config log"):
        config_parts = command.split(" ")
        if len(config_parts) == 4 and config_parts[2] == "user.name":
            user_data["name"] = config_parts[3]
            response = f"User name set to: {user_data['name']}"
        else:
            response = "Invalid 'config log' command format. Use 'config log user.name <name>' to set the user name."
    elif command.lower() == "show log":
        response = "Current User Configuration:\n"
        response += f"User Name: {user_data.get('name', 'Not set')}\n"
        response += "\nLog Entries:\n"
        for index, log_entry in enumerate(log_entries):
            response += f"{index + 1}. {log_entry}\n"
    elif command.lower().startswith("log"):
        log_entry = command[4:].strip()
        log_entries.append(log_entry)
        response = f"Log entry saved: {log_entry}"
    elif command.lower().startswith("run js/"):
        code = command[7:].strip()
        try:
            response = eval(code)
        except Exception as e:
            response = f"Error: {e}"
    elif command.lower().startswith("rec()"):
        def rec_function():
            t = threading.currentThread()
            while getattr(t, "do_run", True):
                print("working...")
                time.sleep(0.125)
        
        rec_thread = threading.Thread(target=rec_function)
        rec_thread.start()
        return
    else:
        response = "Command not recognized"

    command_history.append(command)
    response_history.append(response)
    print(f"db$ {command}")
    print(response)

if __name__ == "__main__":
    while True:
        command = input("db$ ")
        run_command(command)
